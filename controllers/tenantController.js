const tenantService = require('../services/tenantService');

const register = async (req, res) => {
    try {
        const { email, name, photo, loginType, stripeCustomerId } = req.body;

        if (!email || !name) {
            return res.status(400).json({ error: 'Email and Name are required' });
        }

        // 1. Verificar si el usuario ya existe
        const existingUser = await tenantService.findUserByEmail(email);
        if (existingUser.exists) {
            return res.status(200).json({
                message: 'User already exists',
                tenantId: existingUser.user.tenant_id
            });
        }

        // 2. Registrar el tenant y usuario
        const result = await tenantService.registerTenant({
            email,
            name,
            photo,
            loginType,
            stripeCustomerId,
            routesLimit: req.body.routesLimit || 1
        });

        return res.status(201).json(result);
    } catch (error) {
        console.error('Error in tenant registration controller:', error);
        return res.status(500).json({ error: 'Internal server error during registration' });
    }
};

const checkUser = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await tenantService.findUserByEmail(email);
        return res.status(200).json({ exists: user.exists, user: user.user });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error checking user' });
    }
};

const getInfo = async (req, res) => {
    try {
        const { tenantId } = req.query;
        if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required' });
        const info = await tenantService.getTenantInfo(tenantId);
        if (!info) return res.status(404).json({ error: 'Tenant not found' });
        return res.status(200).json(info);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error fetching tenant info' });
    }
};

const update = async (req, res) => {
    try {
        const { tenantId, company_name, subdomain } = req.body;
        if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required' });
        const updated = await tenantService.updateTenant(tenantId, { company_name, subdomain });
        return res.status(200).json({ success: true, tenant: updated });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { tenantId, email, newPassword } = req.body;
        if (!tenantId || !email || !newPassword) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        await tenantService.updateAdminPassword(tenantId, email, newPassword);
        return res.status(200).json({ success: true, message: "Contraseña actualizada correctamente" });
    } catch (error) {
        return res.status(500).json({ error: 'Error actualizando contraseña' });
    }
};

module.exports = {
    register,
    checkUser,
    getInfo,
    update,
    updatePassword
};
