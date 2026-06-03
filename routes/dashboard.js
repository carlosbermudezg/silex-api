const express = require('express');
const creditoController = require('../controllers/credito.controller');
const verifyToken = require('../utils/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const validateRuta = require('../middlewares/validateRuta');
const router = express.Router();

//Ruta para obtener datos para el dashboard
router.get(
    '/datadash',
    verifyToken, 
    allowRoles("administrador", "administrador_oficina", "cobrador"),
    validateRuta,
    creditoController.getDataDash
); //Verificado

//Ruta para obtener datos para las barras del dashboard
router.get(
    '/datadashbars',
    verifyToken,
    allowRoles("administrador", "administrador_oficina"),
    validateRuta,
    creditoController.getDataDashBars
); //Verificado

module.exports = router;