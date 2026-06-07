const express = require('express');
const router = express.Router();
const CajaController = require('../controllers/caja.controller');
const verifyToken = require('../utils/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const allowPermissions = require('../middlewares/allowPermissions');
const validateRuta = require('../middlewares/validateRuta');
const validateOficina = require('../middlewares/validateOficina');

// Ruta para obtener todas las cajas con paginación, búsqueda y filtro por oficina
router.get(
    '/',
    verifyToken,
    allowRoles("administrador", "administrador_oficina"),
    allowPermissions('viewcj'),
    validateOficina,
    CajaController.getAllCajas
); //Verificado

// Ruta para obtener caja por rutaId con sus movimientos paginados
router.get(
    '/ruta',
    verifyToken,
    allowRoles("administrador", "administrador_oficina", "cobrador"),
    allowPermissions('viewcj'),
    validateRuta,
    CajaController.getCajaByRutaId
); //Verificado

// Ruta para registrar ingreso
router.post(
    '/ingreso/:rutaId',
    verifyToken,
    allowRoles("administrador", "administrador_oficina"),
    allowPermissions('addin'),
    validateRuta,
    CajaController.crearIngreso
); //Verificado

// Ruta para registrar egreso
router.post(
    '/egreso/:rutaId',
    verifyToken,
    allowRoles("administrador", "administrador_oficina", "cobrador"),
    allowPermissions('addeg'),
    validateRuta,
    CajaController.crearEgreso
); //Verificado

//Obtener comprobante por id
router.get('/comprobante/:id', verifyToken, CajaController.getComprobanteById);
//Ruta para aprobar egreso
router.put('/aprobar-egreso/:id', verifyToken, CajaController.aprobarEgreso);
//Ruta para rechazar un egreso
router.put('/rechazar-egreso/:id', verifyToken, CajaController.rechazarEgreso);
//Ruta para anular un abono
router.post('/anular-abono', verifyToken, CajaController.anularAbono);

//Ruta para cerrar caja
router.post(
    '/cerrar-caja/:rutaId',
    verifyToken,
    allowRoles("administrador", "administrador_oficina"),
    allowPermissions('cerrarcj'),
    validateRuta,
    CajaController.cerrarCaja
); //Verificado

//Ruta para bloquear caja
router.post(
    '/bloquear-caja/:rutaId',
    verifyToken,
    allowRoles("administrador", "administrador_oficina"),
    allowPermissions('bloqcj'),
    validateRuta,
    CajaController.bloquearCaja
); //Verificado

//Ruta para abrir caja
router.post(
    '/abrir-caja/:rutaId',
    verifyToken,
    allowRoles("administrador", "administrador_oficina"),
    allowPermissions('opencj'),
    validateRuta,
    CajaController.abrirCaja
); //Verificado

module.exports = router;