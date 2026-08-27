const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/create-token', paymentController.createPaymentToken);
// NOT: POST /payment/callback zaten server.js'de en üstte tanımlandı!
router.get('/callback', paymentController.paymentCallbackGet);
router.get('/test', paymentController.paymentTest);
router.get('/debug', paymentController.paymentDebug);

router.get('/success', paymentController.paymentSuccess);
router.get('/fail', paymentController.paymentFail);

module.exports = router;
