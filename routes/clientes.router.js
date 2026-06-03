const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/cliente.controller');
const verifyToken = require('../utils/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const allowPermissions = require('../middlewares/allowPermissions');
const validateRuta = require('../middlewares/validateRuta');

// Crear un cliente, todos los roles pueden crear clientes, pero se asignará la ruta desde el frontend dependiendo del rol
router.post(
    '/',
    verifyToken,
    allowRoles('administrador', 'administrador_oficina', 'cobrador'),
    allowPermissions('addcl'),
    validateRuta,
    clienteController.createCliente
); //Verificado

// Obtener todos los clientes
router.get(
    '/',
    verifyToken,
    allowRoles('administrador', 'administrador_oficina', 'cobrador'),
    allowPermissions('viewcl'),
    validateRuta,
    clienteController.getAllClientes
); //Verificado

// Editar un cliente
router.put(
    '/',
    verifyToken,
    allowRoles('administrador', 'administrador_oficina', 'cobrador'),
    allowPermissions('editcl'),
    validateRuta,
    clienteController.updateCliente
); //Verificado

// Obtener un cliente por ID
router.get(
    '/:id',
    verifyToken,
    allowRoles('administrador', 'administrador_oficina', 'cobrador'),
    allowPermissions('viewcl'),
    validateRuta,
    clienteController.getClienteById
); //Verificado

//Eliminar un cliente
router.delete(
    '/',
    verifyToken,
    allowRoles('administrador', 'administrador_oficina'),
    allowPermissions('archus'),
    validateRuta,
    clienteController.deleteCliente
); // Verificado

module.exports = router;
