const Stripe = require('stripe');
const poolMaster = require('../config/dbMaster');
const poolSaas = require('../config/db'); // Points to client_db_1
const { sendSubscriptionActivationEmail, sendAdminNotificationEmail } = require('../utils/mailer');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Crea una sesión de checkout para suscripción
 */
async function createCheckoutSession({ userId, email, priceId, quantity }) {
    const client = await poolMaster.connect();
    try {
        // 1. Obtener datos del usuario y tenant
        const userRes = await client.query(`
            SELECT u.*, t.stripe_customer_id, t.subscription_ends_at, t.id as tenant_id, t.schema_name
            FROM "user" u
            JOIN tenant t ON u.tenant_id = t.id
            WHERE u.id = $1
        `, [userId]);

        if (userRes.rows.length === 0) throw new Error("User not found");
        const user = userRes.rows[0];

        if (!user.tenant_id) throw new Error("Tenant not found");

        // 2. Calcular trial carryover
        let subscriptionData = {};
        const trialEndsAt = user.subscription_ends_at;
        const now = new Date();

        if (trialEndsAt && trialEndsAt > now) {
            subscriptionData = {
                trial_end: Math.floor(trialEndsAt.getTime() / 1000)
            };
        }

        const session = await stripe.checkout.sessions.create({
            customer: user.stripe_customer_id || undefined,
            customer_email: user.stripe_customer_id ? undefined : email,
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: parseInt(quantity),
                },
            ],
            mode: "subscription",
            subscription_data: subscriptionData,
            success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
            cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/subscription?canceled=true`,
            metadata: {
                userId: userId.toString(),
                tenantId: user.tenant_id.toString(),
                email: email,
                quantity: quantity.toString(),
                priceId: priceId
            },
        });

        return { url: session.url };
    } finally {
        client.release();
    }
}

/**
 * Crea una sesión del portal de facturación
 */
async function createPortalSession({ userId }) {
    const client = await poolMaster.connect();
    try {
        const userRes = await client.query(`
            SELECT t.stripe_customer_id
            FROM "user" u
            JOIN tenant t ON u.tenant_id = t.id
            WHERE u.id = $1
        `, [userId]);

        if (userRes.rows.length === 0 || !userRes.rows[0].stripe_customer_id) {
            throw new Error("No subscription found");
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: userRes.rows[0].stripe_customer_id,
            return_url: `${process.env.NEXTAUTH_URL}/dashboard/subscription`,
        });

        return { url: session.url };
    } finally {
        client.release();
    }
}

/**
 * Procesa eventos de webhook de Stripe
 */
async function handleWebhookEvent(event) {
    const client = await poolMaster.connect();
    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const userId = session.metadata?.userId;
                const tenantId = session.metadata?.tenantId;

                if (!userId || !tenantId) {
                    console.error("⚠️ Error: metadata missing in webhook");
                    break;
                }

                // 1. Get Current Tenant data for rollover
                const currentTenant = await client.query('SELECT status, subscription_ends_at FROM tenant WHERE id = $1', [tenantId]);
                const tenantData = currentTenant.rows[0];
                
                // 2. Get Subscription details for dates
                let subStart = new Date();
                let subEnd = new Date();
                subEnd.setDate(subEnd.getDate() + 30); // fallback 30 days

                // Retrieve safe dates from Stripe
                if (session.subscription) {
                    try {
                        let subscriptionObj = null;
                        if (typeof session.subscription === 'string') {
                            subscriptionObj = await stripe.subscriptions.retrieve(session.subscription);
                        } else if (typeof session.subscription === 'object') {
                            subscriptionObj = session.subscription;
                        }

                        if (subscriptionObj) {
                            if (subscriptionObj.current_period_start) {
                                subStart = new Date(subscriptionObj.current_period_start * 1000);
                            }
                            if (subscriptionObj.current_period_end) {
                                subEnd = new Date(subscriptionObj.current_period_end * 1000);
                            }
                        }
                    } catch (e) {
                        console.error("Error retrieving Stripe subscription dates:", e.message);
                    }
                }

                // Protect against NaN
                if (isNaN(subStart.getTime())) subStart = new Date();
                if (isNaN(subEnd.getTime())) {
                    subEnd = new Date();
                    subEnd.setDate(subEnd.getDate() + 30);
                }

                // Rollover Logic: If they have trial days left, add them to subEnd
                if (tenantData && tenantData.subscription_ends_at) {
                    let endsAtMs = null;
                    if (tenantData.subscription_ends_at instanceof Date) {
                        endsAtMs = tenantData.subscription_ends_at.getTime();
                    } else if (typeof tenantData.subscription_ends_at === 'string') {
                        endsAtMs = new Date(tenantData.subscription_ends_at).getTime();
                    }

                    if (endsAtMs !== null && !isNaN(endsAtMs)) {
                        const now = new Date().getTime();
                        const remainingMs = endsAtMs - now;
                        
                        if (remainingMs > 0 && !isNaN(subEnd.getTime())) {
                            const newEndMs = subEnd.getTime() + remainingMs;
                            if (!isNaN(newEndMs)) {
                                subEnd = new Date(newEndMs);
                                console.log(`🎁 Rollover: Adding ${Math.ceil(remainingMs / (1000 * 60 * 60 * 24))} days to subscription.`);
                            }
                        }
                    }
                }

                await client.query('BEGIN');

                // 3. Update Tenant
                const tenantRes = await client.query(`
                    UPDATE tenant 
                    SET stripe_customer_id = $1, 
                        stripe_subscription_id = $2, 
                        status = 'active', 
                        subscription_start_at = $3,
                        subscription_ends_at = $4,
                        routes_limit = $5, 
                        "updated_at" = NOW()
                    WHERE id = $6
                    RETURNING id, schema_name, company_name
                `, [
                    session.customer, 
                    session.subscription, 
                    subStart,
                    subEnd,
                    parseInt(session.metadata?.quantity || "1"), 
                    tenantId
                ]);

                if (tenantRes.rows.length > 0) {
                    await client.query('UPDATE "user" SET has_suscription = true WHERE tenant_id = $1', [tenantId]);
                }

                const tenant = tenantRes.rows[0];

                // 2. Update User
                await client.query(`
                    UPDATE "user" SET has_suscription = true, "updated_at" = NOW()
                    WHERE id = $1
                    RETURNING email, name
                `, [userId]);

                const user = (await client.query('SELECT email, name FROM "user" WHERE id = $1', [userId])).rows[0];

                await client.query('COMMIT');

                // 3. Sync SaaS DB
                await syncSaaSLimit(tenant.schema_name, parseInt(session.metadata?.quantity || "1"));

                // 4. Emails
                const planNames = {
                    [process.env.NEXT_PUBLIC_STRIPE_PRICE_BASICO]: "Básico",
                    [process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESIONAL]: "Profesional",
                    [process.env.NEXT_PUBLIC_STRIPE_PRICE_EMPRESARIAL]: "Empresarial"
                };
                const planName = planNames[session.metadata?.priceId] || "Personalizado";

                await sendSubscriptionActivationEmail({
                    to: user.email,
                    name: user.name,
                    planName,
                    amount: (session.amount_total / 100).toFixed(2),
                    routes: parseInt(session.metadata?.quantity || "1"),
                    periodEnd: subEnd
                });

                await sendAdminNotificationEmail({
                    customerEmail: user.email,
                    planName,
                    amount: (session.amount_total / 100).toFixed(2),
                    routes: parseInt(session.metadata?.quantity || "1"),
                    tenantName: tenant.company_name
                });
                break;
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object;
                const quantity = subscription.items.data[0]?.quantity || 1;

                // Guard against null/undefined timestamps from Stripe
                const rawStart = subscription.current_period_start;
                const rawEnd = subscription.current_period_end;
                let subStart = rawStart ? new Date(rawStart * 1000) : new Date();
                let subEnd = rawEnd ? new Date(rawEnd * 1000) : new Date();
                if (isNaN(subStart.getTime())) subStart = new Date();
                if (isNaN(subEnd.getTime())) {
                    subEnd = new Date();
                    subEnd.setDate(subEnd.getDate() + 30);
                }

                const tenantRes = await client.query(`
                    UPDATE tenant 
                    SET status = $1, 
                        subscription_start_at = $2,
                        subscription_ends_at = $3, 
                        routes_limit = $4, 
                        "updated_at" = NOW()
                    WHERE stripe_customer_id = $5
                    RETURNING id, schema_name
                `, [
                    subscription.status === 'active' ? 'active' : (subscription.status === 'trialing' ? 'trial' : 'past_due'), 
                    subStart,
                    subEnd, 
                    quantity, 
                    subscription.customer
                ]);

                if (tenantRes.rows.length > 0) {
                    await syncSaaSLimit(tenantRes.rows[0].schema_name, quantity);
                    await client.query('UPDATE "user" SET has_suscription = true WHERE tenant_id = $1', [tenantRes.rows[0].id]);
                }
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object;
                const tenantRes = await client.query(`
                    UPDATE tenant SET status = 'canceled', "updated_at" = NOW()
                    WHERE stripe_customer_id = $1
                    RETURNING id
                `, [subscription.customer]);

                if (tenantRes.rows.length > 0) {
                    await client.query(`
                        UPDATE "user" SET has_suscription = false, "updated_at" = NOW()
                        WHERE tenant_id = $1
                    `, [tenantRes.rows[0].id]);
                }
                break;
            }
        }
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function syncSaaSLimit(schema, qty) {
    const clientSaas = await poolSaas.connect();
    try {
        await clientSaas.query(`
            ALTER TABLE "${schema}"."config_default" ADD COLUMN IF NOT EXISTS "routes_limit" INTEGER DEFAULT 1;
        `);
        await clientSaas.query(`
            UPDATE "${schema}"."config_default" SET "routes_limit" = $1 WHERE id = 1;
        `, [qty]);
    } catch (err) {
        console.error("❌ Error syncing SaaS limit:", err);
    } finally {
        clientSaas.release();
    }
}

async function updateSubscription({ userId, priceId, quantity }) {
    const client = await poolMaster.connect();
    try {
        const userRes = await client.query(`
            SELECT t.stripe_subscription_id, t.routes_limit, t.schema_name
            FROM "user" u
            JOIN tenant t ON u.tenant_id = t.id
            WHERE u.id = $1
        `, [userId]);

        if (userRes.rows.length === 0 || !userRes.rows[0].stripe_subscription_id) {
            console.error(`❌ No stripe_subscription_id found for userId=${userId}. Row:`, userRes.rows[0]);
            throw new Error("No active subscription found to update. Please contact support.");
        }

        const subscriptionId = userRes.rows[0].stripe_subscription_id;
        const currentQuantity = parseInt(userRes.rows[0].routes_limit || 1);
        const newQuantity = parseInt(quantity);
        const isUpgrade = newQuantity > currentQuantity;

        console.log(`📦 Subscription update: userId=${userId} | ${currentQuantity} → ${newQuantity} routes | ${isUpgrade ? 'UPGRADE' : 'DOWNGRADE'}`);

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const itemId = subscription.items.data[0].id;

        let updatedSubscription;

        if (isUpgrade) {
            // UPGRADE: charge the prorated difference immediately
            updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
                items: [{ id: itemId, price: priceId, quantity: newQuantity }],
                proration_behavior: 'always_invoice',
                metadata: { quantity: quantity.toString(), priceId },
            });

            // Immediately pay the proration invoice so the charge happens now
            let isPaid = false;
            try {
                const invoices = await stripe.invoices.list({
                    subscription: subscriptionId,
                    status: 'open',
                    limit: 1,
                });
                if (invoices.data.length > 0) {
                    const invoice = await stripe.invoices.pay(invoices.data[0].id);
                    isPaid = invoice.status === 'paid';
                    if (isPaid) {
                        console.log(`✅ Upgrade payment for ${invoices.data[0].id} successful.`);
                    }
                } else {
                    // Sometimes Stripe doesn't generate an invoice if the amount is $0 (proration)
                    isPaid = true; 
                    console.log(`ℹ️ No proration invoice needed/generated for upgrade.`);
                }
            } catch (invoiceError) {
                console.error('⚠️ Upgrade payment FAILED:', invoiceError.message);
                // IF UPGRADE PAYMENT FAILS, WE SHOULD NOT UPDATE OUR LOCAL DB!
                // The user remains at currentQuantity in our app.
                throw new Error(`The upgrade payment failed: ${invoiceError.message}. Please check your payment method.`);
            }

            if (!isPaid) {
                throw new Error("The upgrade payment was not successful. Please check your payment method.");
            }

        } else {
            // DOWNGRADE: schedule for end of period (via proration_behavior: none)
            // No refund is issued.
            updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
                items: [{ id: itemId, price: priceId, quantity: newQuantity }],
                proration_behavior: 'none',
                billing_cycle_anchor: 'unchanged',
                metadata: { quantity: quantity.toString(), priceId },
            });
            console.log(`🔽 Downgrade registered in Stripe for end of cycle (no refund).`);
        }

        // 3. Sync local DB ONLY if Stripe/Payment succeeded
        await client.query(`
            UPDATE tenant SET routes_limit = $1, "updated_at" = NOW() WHERE stripe_subscription_id = $2
        `, [newQuantity, subscriptionId]);

        await syncSaaSLimit(userRes.rows[0].schema_name, newQuantity);

        console.log(`🚀 Final Sync: userId=${userId} is now at ${newQuantity} routes. Stripe sub=${subscriptionId}`);

        return {
            success: true,
            subscription: updatedSubscription,
            type: isUpgrade ? 'upgrade' : 'downgrade',
            newRoutesLimit: newQuantity
        };
    } catch (error) {
        console.error(`❌ Error in updateSubscription for userId=${userId}:`, error.message);
        throw error;
    } finally {
        client.release();
    }
}


module.exports = {
    createCheckoutSession,
    createPortalSession,
    handleWebhookEvent,
    updateSubscription
};
