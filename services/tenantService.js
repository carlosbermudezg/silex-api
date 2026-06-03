const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Stripe = require('stripe');
const poolMaster = require('../config/dbMaster');
const poolSaas = require('../config/db'); // Points to client_db_1
const { sendDetailedLogEmail, sendWelcomeEmail } = require('../utils/mailer');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Crea un esquema completo para un tenant usando el template SQL
 */
async function createTenantSchema(schemaName, adminName = 'Admin', adminEmail = '', subdomain = '', subscriptionEndsAt = null) {
    const logs = [];
    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const icon = type === 'error' ? '❌' : (type === 'success' ? '✅' : '📦');
        const formattedMessage = `${timestamp} - ${icon} ${message}`;
        logs.push(formattedMessage);
        if (type === 'error') console.error(formattedMessage);
        else console.log(formattedMessage);
    };

    const randomPassword = crypto.randomBytes(6).toString('hex');
    addLog(`Contraseña aleatoria generada para el administrador`);

    const sendFinalEmail = async (status) => {
        const logHtml = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: ${status === 'success' ? '#2e7d32' : '#d32f2f'}">
                    Reporte de Creación de Tenant: ${status === 'success' ? 'EXITOSO' : 'FALLIDO'}
                </h2>
                <p><strong>Schema:</strong> ${schemaName}</p>
                <p><strong>Subdomain:</strong> ${subdomain}</p>
                <p><strong>Admin:</strong> ${adminName} (${adminEmail})</p>
                <hr />
                <h3>Log Detallado:</h3>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace;">
                    ${logs.map(log => `<div>${log}</div>`).join('')}
                </div>
            </div>
        `;

        await sendDetailedLogEmail({
            subject: `[${status.toUpperCase()}] Creación de Tenant: ${schemaName}`,
            html: logHtml
        });
    };

    try {
        const safeSchemaName = schemaName.replace(/[^a-z0-9_]/g, '');
        if (!safeSchemaName) {
            addLog('Nombre de esquema inválido', 'error');
            throw new Error('Invalid schema name');
        }

        addLog(`Iniciando creación del esquema: ${safeSchemaName} en base de datos SAAS`);

        const sqlTemplatePath = path.join(__dirname, 'default.sql');
        addLog(`Leyendo template SQL desde: ${sqlTemplatePath}`);

        let sqlContent;
        try {
            sqlContent = await fs.readFile(sqlTemplatePath, 'latin1');
        } catch (readError) {
            addLog(`Error leyendo archivo SQL: ${readError.message}`, 'error');
            throw readError;
        }

        sqlContent = sqlContent.replace(/tenant_001/g, safeSchemaName);
        sqlContent = sqlContent.replace(/[^\x00-\xFF]/g, '');
        sqlContent = sqlContent.replace(/COPY\s+[^;]+FROM\s+stdin;[\s\S]*?^\\\.\s*$/gim, '');

        const lines = sqlContent.split(/\r?\n/);
        const cleanedLines = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length === 0 || trimmed.startsWith('--') || trimmed.startsWith('\\') ||
                trimmed.startsWith('SET ') || trimmed.startsWith('SELECT pg_catalog') ||
                trimmed.includes('TOC entry') || trimmed.includes('Dependencies:') ||
                trimmed.includes('pg_database_owner')) continue;
            cleanedLines.push(line);
        }

        const cleanedSql = cleanedLines.join('\n');
        addLog(`Ejecutando SQL generado en base de datos SAAS...`);

        try {
            await poolSaas.query(cleanedSql);
            addLog(`Estructura y datos base aplicados correctamente`, 'success');
        } catch (sqlError) {
            addLog(`Error ejecutando SQL base: ${sqlError.message}`, 'error');
            throw sqlError;
        }

        // 2.5 Insertar Configuraciones Iniciales
        addLog(`Insertando configuraciones iniciales obligatorias...`);
        try {
            const client = await poolSaas.connect();
            try {
                await client.query(`
                    INSERT INTO "${safeSchemaName}".config_caja (id, hora_cierre_caja, hora_apertura_caja, hora_gastos)
                    VALUES (1, '20:00:00', '08:00:00', '18:00:00')
                    ON CONFLICT (id) DO NOTHING;
                `);

                await client.query(`
                    INSERT INTO "${safeSchemaName}".config_default 
                    (id, monto_minimo, monto_maximo, plazo_minimo, plazo_maximo, interes, max_credits, frecuencia_pago, days_to_yellow, days_to_red, porcentaje_abono_maximo, porcentaje_minimo_novacion, routes_limit)
                    VALUES 
                    (1, 10.00, 1000.00, 1, 30, 10.00, 1, ARRAY['diario','semanal','quincenal','mensual'], 1, 3, 100.00, 50.00, 1)
                    ON CONFLICT (id) DO NOTHING;
                `);

                await client.query(`
                    INSERT INTO "${safeSchemaName}".config_dias_no_laborables (id, excluir_sabados, excluir_domingos, updated_at)
                    VALUES (1, false, true, NOW())
                    ON CONFLICT (id) DO NOTHING;
                `);

                await client.query(`
                    INSERT INTO "${safeSchemaName}".empresas
                    (nombre, ruc, direccion, telefono, correo, logo, "createdAt", "updatedAt")
                    VALUES ('Empresa Demo', '9999999999', 'Calle Falsa 123', '3000000000', 'demo@empresa.com', '', NOW(), NOW())
                    ON CONFLICT (ruc) DO NOTHING;
                `);
            } finally {
                client.release();
            }
            addLog(`Configuraciones iniciales insertadas correctamente`, 'success');
        } catch (configError) {
            addLog(`Error insertando configuraciones iniciales: ${configError.message}`, 'error');
        }

        // 3. Crear Permiso Superadministrador
        addLog(`Creando perfil de permisos: Super Administrador`);
        const allPermissions = [
            "addcl", "viewcl", "archcl", "editcl",
            "addpr", "viewpr", "archpr", "edirpr",
            "addpcr", "viewcr", "archcr", "edircr", "nullcr", "mknovcr",
            "addin", "addeg", "autorize", "viewcj", "bloqcj", "cerrarcj", "nullab",
            "viewStatusAccount", "viewCredits", "viewInEg", "viewUtility",
            "viewConfigCredits", "editConfigCredits", "viewRutaConfig", "editRutaConfig", "viewConfigCaja", "editConfigCaja", "viewLaboral", "addLaboral", "deleteLaboral", "viewConfigIn", "addConfigInCat", "editConfigInCat", "archConfigInCat", "viewConfigEg", "addConfigEgCat", "editConfigEgCat", "archConfigEgCat", "viewConfigBuro", "editConfigBuro",
            "viewEmpresaData", "editEmpresaData",
            "addof", "viewof", "editof", "delof",
            "addrut", "viewrut", "editrut", "delrut",
            "viewRutaTr", "mkRutaTr", "viewClTr", "mkClTr", "viewMoneyTr", "mkMoneyTr",
            "viewVh", "addVh", "editVh", "delVh",
            "addperm", "editperm", "viewperm", "delperm",
            "addus", "viewus", "editus", "archus"
        ];
        const permissionsJson = JSON.stringify(allPermissions);

        try {
            await poolSaas.query(`
                INSERT INTO "${safeSchemaName}".permisos (nombre, descripcion, "createdAt", "updatedAt", public_id)
                VALUES ('Super Administrador', ARRAY['${permissionsJson}'], NOW(), NOW(), $1)
            `, [crypto.randomUUID()]);
            addLog(`Perfil 'Super Administrador' creado`, 'success');
        } catch (permError) {
            addLog(`Error creando permisos: ${permError.message}`, 'error');
        }

        // 4. Crear Usuario Administrador
        if (adminEmail) {
            addLog(`Creando usuario superadministrador: ${adminEmail}`);
            try {
                const hashedPassword = await bcrypt.hash(randomPassword, 10);
                await poolSaas.query(`
                    INSERT INTO "${safeSchemaName}".usuarios 
                    (nombre, correo, contrasena, tipo, "permisoId", "createdAt", "updatedAt", estado, public_id)
                    VALUES 
                    ($1, $2, $3, 'administrador', 
                        (SELECT id FROM "${safeSchemaName}".permisos WHERE nombre = 'Super Administrador' LIMIT 1),
                        NOW(), NOW(), 'activo', $4)
                `, [adminName, adminEmail, hashedPassword, crypto.randomUUID()]);
                addLog(`Usuario superadministrador creado exitosamente`, 'success');

                await sendWelcomeEmail({
                    to: adminEmail,
                    name: adminName,
                    password: randomPassword,
                    subdomain: subdomain,
                    trialEndsAt: subscriptionEndsAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                });
                addLog(`Correo de bienvenida enviado con éxito`, 'success');
            } catch (adminError) {
                addLog(`Error creando usuario o enviando bienvenida: ${adminError.message}`, 'error');
            }
        }

        addLog(`Proceso de creación de tenant completado para ${safeSchemaName}`, 'success');
        await sendFinalEmail('success');
        return true;
    } catch (error) {
        addLog(`Error fatal creando esquema del tenant: ${error.message}`, 'error');
        await sendFinalEmail('error');
        throw error;
    }
}

/**
 * Registra un nuevo tenant y usuario en la base de datos master
 */
async function registerTenant({ email, name, photo, loginType, routesLimit = 1, timezone }) {
    const uuid = crypto.randomUUID().replace(/-/g, '_');
    const schemaName = `tenant_${uuid}`;
    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 14);

    let stripeCustomerId = null;
    try {
        const customer = await stripe.customers.create({
            email,
            name,
            metadata: { uuid }
        });
        stripeCustomerId = customer.id;
        console.log(`✅ Cliente Stripe creado: ${stripeCustomerId}`);
    } catch (stripeError) {
        console.error("❌ Error creando cliente Stripe:", stripeError);
    }

    // normalize timezone: prefer provided, otherwise env, otherwise default
    const tenantTimezone = (timezone && typeof timezone === 'string')
        ? timezone
        : (process.env.GENERIC_TIMEZONE ? process.env.GENERIC_TIMEZONE.replace(/(^\"|\"$)/g, '') : 'America/Guayaquil');

    const client = await poolMaster.connect();
    try {
        await client.query('BEGIN');

        const now = new Date();
        // Use subscriptionEndsAt declared above

        // 1. Crear el tenant
        const tenantRes = await client.query(`
            INSERT INTO tenant (
                company_name, subdomain, schema_name, database_name, timezone, status, 
                subscription_start_at, subscription_ends_at, 
                stripe_customer_id, routes_limit, "created_at", "updated_at"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING id
        `, [
            name, uuid, schemaName, 'client_db_1', tenantTimezone, 'trial', 
            now, subscriptionEndsAt, 
            stripeCustomerId, routesLimit
        ]);

        const tenantId = tenantRes.rows[0].id;

        // 2. Crear el usuario
        await client.query(`
            INSERT INTO "user" (name, email, photo, login_type, status, tenant_id, has_suscription, "created_at", "updated_at")
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [name, email, photo || '', loginType, 'active', tenantId, false]);

        await client.query('COMMIT');

        // 2.5 Insertar eventos programados por defecto en la tabla master
        try {
            // abrir y cierre por defecto según configuraciones iniciales
            const days = ['lunes','martes','miercoles','jueves','viernes'];
            await poolMaster.query(`
                INSERT INTO scheduled_cron_events (tenant_id, tenant_schema, tenant_database, action, schedule_time, days_of_week, active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5::time, $6, true, NOW(), NOW()),
                       ($1, $2, $3, $7, $8::time, $6, true, NOW(), NOW())
            `, [tenantId, schemaName, 'client_db_1', 'open', '08:00:00', days, 'close', '20:00:00']);
            console.log('✅ Eventos programados por defecto insertados en master para tenant', tenantId);
        } catch (evtErr) {
            console.warn('⚠️ No se pudieron insertar eventos programados por defecto:', evtErr.message);
        }

        // 3. Lanzar creación de esquema en background
        createTenantSchema(schemaName, name, email, uuid, subscriptionEndsAt)
            .then(() => console.log(`✅ Esquema ${schemaName} creado exitosamente`))
            .catch(err => console.error(`❌ Error en creación de esquema ${schemaName}:`, err));

        return { success: true, tenantId, subdomain: uuid };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error registrando tenant:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function findUserByEmail(email) {
    const res = await poolMaster.query(`
        SELECT u.*, 
               t.routes_limit, 
               t.status as tenant_status,
               t.stripe_customer_id, 
               t.subscription_start_at, 
               t.subscription_ends_at,
               u.has_suscription
        FROM "user" u
        LEFT JOIN tenant t ON u.tenant_id = t.id
        WHERE u.email = $1
    `, [email]);
    return {
        exists: res.rows.length > 0,
        user: res.rows[0] || null
    };
}

async function getTenantInfo(tenantId) {
    const client = await poolMaster.connect();
    try {
        const res = await client.query('SELECT company_name, subdomain, schema_name FROM tenant WHERE id = $1', [tenantId]);
        return res.rows[0];
    } finally {
        client.release();
    }
}

async function updateTenant(tenantId, { company_name, subdomain }) {
    const client = await poolMaster.connect();
    try {
        // Check subdomain uniqueness
        const existing = await client.query('SELECT id FROM tenant WHERE subdomain = $1 AND id != $2', [subdomain, tenantId]);
        if (existing.rows.length > 0) throw new Error("El subdominio ya está en uso");

        const res = await client.query(`
            UPDATE tenant SET company_name = $1, subdomain = $2, "updated_at" = NOW()
            WHERE id = $3
            RETURNING *
        `, [company_name, subdomain, tenantId]);
        return res.rows[0];
    } finally {
        client.release();
    }
}

async function updateAdminPassword(tenantId, email, newPassword) {
    const clientMaster = await poolMaster.connect();
    const clientSaas = await poolSaas.connect();
    try {
        const tenantRes = await clientMaster.query('SELECT schema_name FROM tenant WHERE id = $1', [tenantId]);
        if (tenantRes.rows.length === 0) throw new Error("Tenant not found");
        const schemaName = tenantRes.rows[0].schema_name;

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await clientSaas.query(`
            UPDATE "${schemaName}".usuarios 
            SET contrasena = $1, "updated_at" = NOW()
            WHERE correo = $2 AND tipo = 'administrador'
        `, [hashedPassword, email]);

        return { success: true };
    } finally {
        clientMaster.release();
        clientSaas.release();
    }
}

// Helper function to check if an email exists in the master database
async function checkEmailExists(email) {
    const res = await poolMaster.query('SELECT id FROM "user" WHERE email = $1', [email]);
    return res.rows.length > 0;
}

module.exports = {
    registerTenant,
    findUserByEmail, // Keep findUserByEmail as it's a useful utility
    checkEmailExists,
    getTenantInfo,
    updateTenant,
    updateAdminPassword
};
