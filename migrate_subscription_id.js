const { Pool } = require('pg');
require('dotenv').config();

const poolMaster = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE_MASTER,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});

async function migrate() {
    try {
        console.log("Adding stripe_subscription_id column...");
        await poolMaster.query(`
            ALTER TABLE tenant ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
        `);
        console.log("✅ Column added successfully.");
    } catch (err) {
        console.error("❌ Migration error:", err.message);
    } finally {
        await poolMaster.end();
    }
}

migrate();
