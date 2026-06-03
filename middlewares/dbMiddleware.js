const pool = require('../config/db');

module.exports = async function dbMiddleware(req, res, next) {

  let client;
  let released = false;

  const cleanup = async () => {
      if ( released || !client) {
        return;
      }
      released = true;
      try {
        await client.query(
          'RESET search_path'
        );
      } catch (err) {
        console.error(
          'Error resetting search_path:',
          err
        );
      } finally {
        client.release();
      }
    };

  try {
    client = await pool.connect();
    // Configurar schema
    await client.query(
      `
      SELECT pg_catalog.set_config(
        $1,
        $2,
        false
      )
      `,
      [
        'search_path',
        req.schema
      ]
    );
    req.db = client;
    // Liberar conexión
    res.on('finish', cleanup);
    // Si el cliente aborta
    res.on('close', cleanup);
    next();
  } catch (err) {
    await cleanup();
    next(err);
  }
};