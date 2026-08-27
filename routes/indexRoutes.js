const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

router.get('/', indexController.getHome);
router.get('/shop', indexController.getShop);
router.get('/kategori/:slug', indexController.getCategory);
router.get('/product/:id', indexController.getProductDetails);
router.get('/about', indexController.getAbout);
router.get('/contact', indexController.getContact);
router.get('/yuzuk-olcusu-bulma', indexController.getRingSizeFinder);

// Auth Shortcuts
const authController = require('../controllers/authController');
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);

// Cart Routes
router.get('/cart', indexController.getCart);
router.post('/cart/add', indexController.addToCart);
router.post('/cart/remove', indexController.removeFromCart);

// Checkout Route
router.get('/checkout', indexController.getCheckout);

module.exports = router;
