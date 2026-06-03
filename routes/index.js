const express = require('express');

// Importa todas las rutas de los modelos
const routerAuth = require('./auth.router'); //Verificada
const routerDashboard = require('./dashboard'); //Verificada
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
// Agrega otras rutas de ser necesario

const router = express.Router();

// Agrupa las rutas bajo rutas principales
router.use('/auth', routerAuth); //Ruta para manejar permisos @ruta verificada
router.use('/permisos', routerPermisos); //Ruta para manejar permisos @ruta verificada
router.use('/dashboard', routerDashboard); //Ruta para manejar dashboard @ruta verificada
router.use('/clientes', routerClientes);  // Ruta para manejar Clientes @ruta verificada
router.use('/usuarios', routerUsuarios);  // Ruta para manejar Usuarios @ruta verificada

router.use('/creditos', routerCreditos);  // Ruta para manejar Créditos

router.use('/caja', routerCaja); //Ruta para manejar caja
router.use('/recorrido', routerRecorrido); //Ruta para manejar caja
router.use('/rutas', routerRutas);  // Ruta para manejar Productos en las Rutas
router.use('/oficinas', routerOficinas);  // Ruta para manejar Oficinas
router.use('/reportes', routerReporte);  // Ruta para manejar Configuración
router.use('/vehiculos', routerVehiculos);  // Ruta para manejar Vehiculos
router.use('/traslado', routerTraslados);  // Ruta para manejar Pagos
router.use('/config', routerConfig);  // Ruta para manejar Configuración

// Si tienes más rutas, puedes seguir agregándolas de la misma forma
// router.use('/otraRuta', routerOtraRuta);

module.exports = router;

