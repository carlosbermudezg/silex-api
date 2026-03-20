// db.js
const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la conexión a PostgreSQL
const poolMaster = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE_MASTER,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT
});

// Probar conexión
poolMaster.connect()
    .then(client => {
        console.log('✅ Conexión a PostgreSQL exitosa(master)');
        client.release();
    })
    .catch(err => {
        console.error('❌ Error de conexión a PostgreSQL:', err);
    });


// Exportar la conexión (pool) para usarla en los modelos
module.exports = poolMaster;