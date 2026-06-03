const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const verifyToken = require('../utils/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const allowPermissions = require('../middlewares/allowPermissions');

// Crear un nuevo usuario
router.post(
    '/',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('addus'),
    usuarioController.createUsuario
); //Verificado

// Obtener todos los usuarios con paginación
router.get(
    '/',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('viewus'),
    usuarioController.getAllUsuarios
); //Verificado

// Obtener usuarios por oficina con paginación
router.get('/oficina/:oficinaId', verifyToken, usuarioController.getUsuariosByOficina);

// Obtener un usuario por ID
router.get(
    '/:id',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('viewus'),
    usuarioController.getUsuarioById
); //Verificado

// Editar un usuario por public_id
router.put(
    '/:id',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('editus'),
    usuarioController.editUsuario
); //Verificado

module.exports = router;
