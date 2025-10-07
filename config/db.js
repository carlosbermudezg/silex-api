// db.js
const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  options: `-c search_path=${process.env.PGSCHEMA}`
});

// Configurar la zona horaria en cada conexión
pool.on('connect', async (client) => {
  try {
    const tz = process.env.GENERIC_TIMEZONE || 'UTC';
    await client.query(`SET timezone = '${tz}'`);
    console.log(`⏰ Zona horaria de sesión configurada a: ${tz}`);
  } catch (err) {
    console.error('❌ Error al configurar la zona horaria:', err);
  }
});

// Probar conexión
pool.connect()
  .then(client => {
    console.log('✅ Conexión a PostgreSQL exitosa');
    client.release();
  })
  .catch(err => {
    console.error('❌ Error de conexión a PostgreSQL:', err);
  });

// Exportar la conexión (pool) para usarla en los modelos
module.exports = pool;