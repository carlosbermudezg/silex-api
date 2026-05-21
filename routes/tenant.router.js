const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');

router.post('/register', tenantController.register);
router.get('/check', tenantController.checkUser);
router.get('/info', tenantController.getInfo);
router.post('/update', tenantController.update);
router.post('/password', tenantController.updatePassword);

module.exports = router;
