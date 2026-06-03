// dbMaster.js
const { Pool } = require('pg');
require('dotenv').config();

// Determinar timezone (limpiar comillas si las hubiera)
const tz = process.env.GENERIC_TIMEZONE || 'UTC';

// Configuración de la conexión a PostgreSQL (master)
const poolMaster = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE_MASTER,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT
});

// Configurar la zona horaria en cada conexión del pool master
poolMaster.on('connect', async (client) => {
  try {
    // Usar función parametrizada para evitar errores de sintaxis en comandos SET
    await client.query('SELECT pg_catalog.set_config($1, $2, true)', ['TimeZone', tz]);
    console.log(`⏰ Zona horaria de sesión (master) configurada a: ${tz}`);
  } catch (err) {
    console.error('❌ Error al configurar la zona horaria (master):', err);
  }
});

// Probar conexión
poolMaster.connect()
    .then(client => {
        console.log('✅ Conexión a PostgreSQL exitosa(master)');
        client.release();
    })
    .catch(err => {
        console.error('❌ Error de conexión a PostgreSQL (master):', err);
    });

// Exportar la conexión (pool) para usarla en los modelos
module.exports = poolMaster;