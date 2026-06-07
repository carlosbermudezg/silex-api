const express = require('express');

const routerAuth = require('./auth.router');
const routerDashboard = require('./dashboard');
const routerClientes = require('./clientes.router');
const routerUsuarios = require('./usuarios.router');
const routerCreditos = require('./creditos.router');
const routerCaja = require('./caja.router');
const routerRecorrido = require('./recorrido.router');
const routerRutas = require('./rutas.router');
const routerOficinas = require('./oficinas.router');
const routerReporte = require('./reportes.router');
const routerVehiculos = require('./vehiculos.router');
const routerPermisos = require('./permisos.router');
const routerTraslados = require('./traslados.router');
const routerConfig = require('./config.router');
const routerBackup = require('./backup.router');

const router = express.Router();

router.use('/auth', routerAuth); //Ruta para manejar permisos @ruta verificada
router.use('/permisos', routerPermisos); //Ruta para manejar permisos @ruta verificada
router.use('/dashboard', routerDashboard); //Ruta para manejar dashboard @ruta verificada
router.use('/clientes', routerClientes);  // Ruta para manejar Clientes @ruta verificada
router.use('/usuarios', routerUsuarios);  // Ruta para manejar Usuarios @ruta verificada
router.use('/oficinas', routerOficinas);  // Ruta para manejar Oficinas @ruta verificada
router.use('/rutas', routerRutas);  // Ruta para manejar las Rutas del negocio @Por verificar ruta de cobrador

router.use('/caja', routerCaja); //Ruta para manejar caja

router.use('/creditos', routerCreditos);  // Ruta para manejar Créditos

router.use('/config', routerConfig);  // Ruta para manejar Configuración

router.use('/recorrido', routerRecorrido); //Ruta para manejar recorrido de las rutas
router.use('/reportes', routerReporte);  // Ruta para manejar Configuración
router.use('/vehiculos', routerVehiculos);  // Ruta para manejar Vehiculos
router.use('/traslado', routerTraslados);  // Ruta para manejar Pagos

module.exports = router;

