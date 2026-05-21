const nodemailer = require('nodemailer');

const sendDetailedLogEmail = async ({ subject, html, to }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const mailOptions = {
            from: `"Silex System" <${process.env.SMTP_USER}>`,
            to: to || process.env.ADMIN_LOG_EMAIL,
            subject: subject || 'Log de Creación de Tenant',
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Correo enviado: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Error al enviar el correo:', error);
        return null;
    }
};

const sendWelcomeEmail = async ({ to, name, password, subdomain, trialEndsAt }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const loginUrl = `${process.env.NEXTAUTH_URL.replace('localhost:3000', `${subdomain}.localhost:3000`)}`; 

        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px;">¡Bienvenido a Silex System!</h1>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Tu plataforma de gestión está lista</p>
                </div>
                <div style="padding: 30px; line-height: 1.6; color: #444;">
                    <p>Hola <strong>${name}</strong>,</p>
                    <p>Nos emociona informarte que tu espacio de trabajo ha sido creado con éxito. Tu periodo de prueba de <strong>14 días</strong> ha comenzado hoy.</p>
                    
                    <div style="background: #f9f9f9; border-left: 4px solid #2a5298; padding: 20px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #2a5298;">Tus Credenciales de Acceso</h3>
                        <p style="margin: 5px 0;"><strong>Correo:</strong> ${to}</p>
                        <p style="margin: 5px 0;"><strong>Contraseña Temporal:</strong> <span style="background: #fff; padding: 2px 5px; border: 1px dashed #ccc; font-family: monospace;">${password}</span></p>
                        <p style="margin: 5px 0;"><strong>Subdominio:</strong> ${subdomain}</p>
                    </div>

                    <p>Podrás acceder a tu panel desde el siguiente enlace:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${loginUrl}" style="background: #2a5298; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Ir a mi Panel de Control</a>
                    </div>

                    <p style="font-size: 14px; color: #777;">
                        <strong>Información de Prueba:</strong> Tu periodo gratuito termina el <strong>${new Date(trialEndsAt).toLocaleDateString()}</strong>.
                        Te recomendamos cambiar tu contraseña al iniciar sesión por primera vez.
                    </p>
                </div>
                <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888;">
                    &copy; ${new Date().getFullYear()} Silex System. Todos los derechos reservados.
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"Dacan System" <${process.env.SMTP_USER}>`,
            to: to,
            subject: '¡Bienvenido! - Credenciales de tu nueva cuenta en Dacan System',
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Correo de bienvenida enviado a: %s', to);
        return info;
    } catch (error) {
        console.error('❌ Error al enviar correo de bienvenida:', error);
        return null;
    }
};

const sendSubscriptionActivationEmail = async ({ to, name, planName, amount, routes, periodEnd }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
                <h2 style="color: #2a5298;">¡Suscripción Activada!</h2>
                <p>Hola <strong>${name}</strong>,</p>
                <p>Tu suscripción al plan <strong>${planName}</strong> ha sido activada con éxito.</p>
                <ul>
                    <li><strong>Monto pagado:</strong> $${amount}</li>
                    <li><strong>Límite de rutas:</strong> ${routes}</li>
                    <li><strong>Próxima facturación:</strong> ${new Date(periodEnd).toLocaleDateString()}</li>
                </ul>
                <p>Gracias por confiar en nosotros.</p>
            </div>
        `;

        await transporter.sendMail({
            from: `"Silex System" <${process.env.SMTP_USER}>`,
            to: to,
            subject: 'Suscripción Activada - Silex System',
            html: html,
        });
        console.log('📧 Correo de activación enviado a: %s', to);
    } catch (error) {
        console.error('❌ Error enviando email de activación:', error);
    }
};

const sendAdminNotificationEmail = async ({ customerEmail, planName, amount, routes, tenantName }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const html = `
            <div style="font-family: sans-serif; background: #f4f4f4; padding: 20px;">
                <h3>Nueva Suscripción Recibida</h3>
                <p><strong>Cliente:</strong> ${customerEmail}</p>
                <p><strong>Empresa:</strong> ${tenantName}</p>
                <p><strong>Plan:</strong> ${planName}</p>
                <p><strong>Rutas:</strong> ${routes}</p>
                <p><strong>Total:</strong> $${amount}</p>
            </div>
        `;

        await transporter.sendMail({
            from: `"Silex System" <${process.env.SMTP_USER}>`,
            to: process.env.ADMIN_LOG_EMAIL,
            subject: `NUEVA VENTA: ${tenantName} - ${planName}`,
            html: html,
        });
    } catch (error) {
        console.error('❌ Error enviando notificación al admin:', error);
    }
};

module.exports = {
    sendDetailedLogEmail,
    sendWelcomeEmail,
    sendSubscriptionActivationEmail,
    sendAdminNotificationEmail
};
