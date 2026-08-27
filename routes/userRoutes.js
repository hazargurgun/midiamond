const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Kullanıcı girişi kontrol middleware'i
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/auth/login');
};

router.use(isAuthenticated);

router.get('/profile', userController.getProfile);
router.post('/profile/update', userController.updateProfile);

// Favorites Routes
router.get('/favorites', userController.getFavorites);
router.post('/favorites/toggle', userController.toggleFavorite);

module.exports = router;
