const express = require('express');
const router = express.Router();
const trasladoController = require('../controllers/traslado.controller');
const verifyToken = require('../utils/verifyToken');

router.get('/clientes', verifyToken, trasladoController.getTrasladosClientesPaginados);
router.post('/clientes', verifyToken,  trasladoController.createClienteTrasladoMasivo);

module.exports = router;