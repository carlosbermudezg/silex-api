const express = require("express");
const router = require('./routes');
const helmet = require('helmet');
const app = express();
require("dotenv").config();

const cors = require('cors');

const getTenant = require('./middlewares/getTenant');
const resolveTenant = require('./middlewares/resolveTenant');
const dbMiddleware = require('./middlewares/dbMiddleware');

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

app.use(cors());

// Swagger solo en desarrollo
if (process.env.NODE_ENV === 'development') {
  // Definir la configuración para Swagger (Documentación)
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'API de Prestamos',
        version: '1.0.0',
        description: 'Documentación de la API de Prestamos',
      },
    },
    apis: ['./routes/*.js'],
  };
  const swaggerDocs = swaggerJsdoc(swaggerOptions);

  // Configurar la ruta para acceder a la documentación de Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}
//Fin de la documentación

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Stripe router first (handles its own body parsing for webhooks)
app.use('/api/v1/stripe', require('./routes/stripe.router'));

// Global Middlewares for the rest of the API (including tenants)
app.use(express.json({ limit: "10mb" })); 
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Route for tenant registration
app.use('/api/v1/tenants', require('./routes/tenant.router'));

//Middleware para agregar schema dinámico
app.use(getTenant);
app.use(resolveTenant);
app.use(dbMiddleware);

// Todas las rutas
app.use('/api/v1', router)

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 400;
  res.status(status).json({
    error: err.message || 'Error interno del servidor'
  });
});

// Ruta principal
app.get("/", (req, res) => {
  res.send("Sistema de Préstamos API");
});

module.exports = app