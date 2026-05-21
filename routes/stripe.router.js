const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');

router.post('/checkout', express.json(), stripeController.createCheckout);
router.post('/portal', express.json(), stripeController.createPortal);
router.post('/update', express.json(), stripeController.updateSubscription);
// Webhook needs raw body
router.post('/webhook', express.raw({ type: 'application/json' }), stripeController.handleWebhook);

module.exports = router;
