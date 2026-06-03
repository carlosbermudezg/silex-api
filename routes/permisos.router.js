const express = require('express');
const router = express.Router();
const permisoController = require('../controllers/permiso.controller');
const verifyToken = require('../utils/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const allowPermissions = require('../middlewares/allowPermissions');

//Ruta para agregar permisos, solo accesible para administradores con permiso 'addperm'
router.post(
    '/', 
    verifyToken, 
    allowRoles('administrador'),
    allowPermissions('addperm'),
    permisoController.create
); //Verificado

//Ruta para obtener permisos, solo accesible para administradores con permiso 'viewperm'
router.get(
    '/',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('viewperm'),
    permisoController.getAll
); //Verificado 

//Ruta para obtener un permiso por ID, solo accesible para administradores con permiso 'viewperm'
router.get(
    '/:id',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('viewperm'),
    permisoController.getById
); //Verificado

//Ruta para actualizar un permiso, solo accesible para administradores con permiso 'editperm'
router.put(
    '/:id',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('editperm'),
    permisoController.update
); //Verificado

//Ruta para eliminar un permiso, solo accesible para administradores con permiso 'deleteperm'
router.delete(
    '/:id',
    verifyToken,
    allowRoles('administrador'),
    allowPermissions('delperm'),
    permisoController.delete
); //Verificado

module.exports = router;
