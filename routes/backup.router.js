const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const BackupController = require('../controllers/backup.controller');

// Ruta para importar
router.post('/importar', verifyToken, BackupController.importarTransacciones);

module.exports = router;