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
        console.log("Dropping trial_ends_at column...");
        await poolMaster.query(`
            ALTER TABLE tenant DROP COLUMN IF EXISTS trial_ends_at;
        `);
        console.log("✅ Column trial_ends_at dropped successfully.");
    } catch (err) {
        console.error("❌ Migration error:", err.message);
    } finally {
        await poolMaster.end();
    }
}

migrate();
