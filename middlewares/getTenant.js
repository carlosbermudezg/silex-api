module.exports = function getTenant(req, res, next) {
    const origin = req.headers.origin;
    const split1 = origin.split('.')[0];
    const host = split1.split('//')[1];

    if (!host) {
        return res.status(400).json({ error: 'Host no definido' });
    }

    req.tenant = host;

    next();
};