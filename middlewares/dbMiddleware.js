const pool = require('../config/db');

module.exports = async function dbMiddleware(req, res, next) {
    const client = await pool.connect();

    try {
        // 🔐 forma segura
        await client.query(
            'SELECT set_config($1, $2, false)',
            ['search_path', req.schema]
        );

        req.db = client;

        res.on('finish', () => {
            client.release();
        });

        next();
    } catch (err) {
        client.release();
        next(err);
    }
};