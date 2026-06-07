const express = require('express');
const router = express.Router();
const rutaController = require('../controllers/ruta.controller');
const verifyToken = require('../utils/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const allowPermissions = require('../middlewares/allowPermissions');
const validateOficina = require('../middlewares/validateOficina');
const validateRuta = require('../middlewares/validateRuta');

// Crear una nueva ruta
router.post(
    '/',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('addrut'),
    rutaController.createRuta
); //Verificado

// Obtener todas las rutas con paginación y búsqueda
router.get(
    '/',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('viewrut'),
    rutaController.getAllRutas
); //Verificado

// Endpoint para obtener rutas por oficina con paginación
router.get(
    '/oficina',
    verifyToken,
    allowRoles('administrador', 'administrador_oficina'),
    validateOficina,
    allowPermissions('viewrut'),
    rutaController.getRutasByOficina
); //Verificado

// Endpoint para obtener la ruta asignada a un cobrador específico
router.get(
    '/cobro',
    verifyToken,
    allowRoles('administrador', 'administrador_oficina', 'cobrador'),
    validateRuta,
    allowPermissions('viewrutcob'),
    rutaController.getRutaDeCobro
);

// Obtener una ruta por ID
router.get(
    '/:id',
    verifyToken,
    allowRoles('administrador', 'administrador_oficina'),
    allowPermissions('viewrut'),
    rutaController.getRutaById
); //Verificado

// Editar una ruta
router.put(
    '/:id',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('editrut'),
    rutaController.updateRuta
); //Verificado

module.exports = router;