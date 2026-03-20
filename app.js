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
//Fin de la documentación

// Aumenta el límite de tamaño del cuerpo de la solicitud
app.use(express.json({ limit: "10mb" })); // Aumenta el límite a 10MB
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Middleware para procesar JSON
app.use(express.json());

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