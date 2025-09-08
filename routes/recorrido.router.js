const express = require('express');
const router = express.Router();
const recorridoController = require('../controllers/recorrido.controller');
const verifyToken = require('../utils/verifyToken');

// Obtener todas las oficinas con sus rutas
router.get('/', verifyToken, recorridoController.getPagosByRutaAndFecha);

module.exports = router;