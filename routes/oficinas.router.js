const express = require('express');
const router = express.Router();
const oficinaController = require('../controllers/oficina.controller');
const verifyToken = require('../utils/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const allowPermissions = require('../middlewares/allowPermissions');

// Crear una oficina
router.post(
    '/',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('addof'),
    oficinaController.createOficina
); //Verificado

// Obtener todas las oficinas con paginacion y busqueda
router.get(
    '/',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('viewof'),
    oficinaController.getAll
); //Verificado

// Obtener todas las oficinas (se obtendrá según el rol del usuario)
// Si es administrador, se obtendrán todas las oficinas, 
// si es administrador_oficina, se obtendrá solo la oficina asociada al usuario
// Si es otro rol, se denegará el acceso
// Esta ruta se usará para mostrar las oficinas en el dashboard
router.get(
    '/rutas',
    verifyToken,
    allowRoles('administrador', 'administrador_oficina'),
    allowPermissions('viewof'),
    oficinaController.getAllOficinas
); //Verificado

// Obtener una oficina por ID
router.get(
    '/:id',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('viewof'),
    oficinaController.getOficinaById
); //Verificado

// Editar una oficina por id publico
router.put(
    '/:id',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('editof'),
    oficinaController.updateOficina
); //Verificado

// Eliminar una oficina por id publico, solo si no tiene rutas asociadas
router.delete(
    '/:id',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('delof'),
    oficinaController.deleteOficina
); //Verificado

module.exports = router;
