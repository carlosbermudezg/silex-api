const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE_MASTER,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});

async function checkData() {
    try {
        const res = await pool.query('SELECT id, company_name, subscription_start_at, subscription_ends_at, status FROM tenant ORDER BY created_at DESC LIMIT 5');
        console.log("Last 5 Tenants:");
        console.log(JSON.stringify(res.rows, null, 2));

        const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tenant'");
        console.log("\nColumns in 'tenant' table:");
        console.log(columns.rows.map(r => r.column_name).join(", "));
    } catch (err) {
        console.error("Error checking data:", err.message);
    } finally {
        await pool.end();
    }
}

checkData();
