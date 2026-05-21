const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE_MASTER,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT
});
pool.query(`SELECT u.email, u.has_suscription, t.status FROM "user" u JOIN tenant t ON u.tenant_id = t.id ORDER BY u.created_at DESC LIMIT 5`)
    .then(res => { console.log(JSON.stringify(res.rows, null, 2)); process.exit(0); })
    .catch(err => { console.error(err); process.exit(1); });
