const stripeService = require('../services/stripeService');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createCheckout = async (req, res) => {
    try {
        const { userId, email, priceId, quantity } = req.body;
        if (!userId || !email || !priceId || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const session = await stripeService.createCheckoutSession({ userId, email, priceId, quantity });
        res.json(session);
    } catch (error) {
        console.error("Stripe Checkout Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const createPortal = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID is required" });
        const session = await stripeService.createPortalSession({ userId });
        res.json(session);
    } catch (error) {
        console.error("Stripe Portal Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`❌ Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        await stripeService.handleWebhookEvent(event);
        res.json({ received: true });
    } catch (error) {
        console.error("Webhook Handler Error:", error);
        res.status(500).json({ error: "Webhook Handler Error" });
    }
};

const updateSubscription = async (req, res) => {
    try {
        const { userId, priceId, quantity } = req.body;
        if (!userId || !priceId || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const result = await stripeService.updateSubscription({ userId, priceId, quantity });
        res.json(result);
    } catch (error) {
        console.error("Stripe Update Error:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createCheckout,
    createPortal,
    handleWebhook,
    updateSubscription
};
