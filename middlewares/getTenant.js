module.exports = function getTenant(req, res, next) {
    const host = req.headers['x-tenant'];

    if (!host) {
        return res.status(400).json({ error: 'Host no definido' });
    }

    req.tenant = host;

    next();
};