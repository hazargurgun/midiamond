const User = require('../models/User');
const Order = require('../models/Order');

exports.getProfile = async (req, res) => {
    try {
        const userId = req.session.user._id || req.session.user.id;
        
        // Fetch user data excluding password and populate favorites
        const user = await User.findById(userId).select('-password').populate('favorites');
        
        if (!user) {
            req.session.user = null;
            return res.redirect('/auth/login');
        }
        
        // Fetch user's orders and populate product details
        const orders = await Order.find({ user: userId })
                                  .populate('items.product')
                                  .sort({ createdAt: -1 });

        res.render('user/profile', { 
            profileUser: user, 
            orders: orders,
            successMessage: req.session.successMessage || null,
            errorMessage: req.session.errorMessage || null
        });

        // Clear messages after displaying
        req.session.successMessage = null;
        req.session.errorMessage = null;

    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.session.user._id || req.session.user.id;
        const { name, phone, address } = req.body;

        await User.findByIdAndUpdate(userId, {
            name: name,
            phone: phone,
            address: address
        });

        // Update session name if it was changed
        req.session.user.name = name;
        
        req.session.successMessage = 'Profil bilgileriniz başarıyla güncellendi.';
        req.session.save(err => {
            if (err) console.error(err);
            res.redirect('/user/profile');
        });

    } catch (err) {
        console.error(err);
        req.session.errorMessage = 'Bilgiler güncellenirken bir hata oluştu.';
        req.session.save(err2 => {
            res.redirect('/user/profile');
        });
    }
};

exports.getFavorites = async (req, res) => {
    try {
        const userId = req.session.user._id || req.session.user.id;
        const user = await User.findById(userId).populate('favorites');
        
        res.render('user/favorites', {
            favorites: user ? user.favorites : []
        });
    } catch (err) {
        console.error('Error fetching favorites page:', err);
        res.redirect('/');
    }
};

exports.toggleFavorite = async (req, res) => {
    try {
        const userId = req.session.user._id || req.session.user.id;
        const { productId } = req.body;
        
        if (!productId) {
            return res.status(400).json({ success: false, message: 'Ürün ID eksik' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }
        
        if (!user.favorites) {
            user.favorites = [];
        }
        
        const index = user.favorites.indexOf(productId);
        let action = '';
        if (index > -1) {
            user.favorites.splice(index, 1);
            action = 'removed';
        } else {
            user.favorites.push(productId);
            action = 'added';
        }
        
        await user.save();
        res.json({ success: true, action: action });
    } catch (err) {
        console.error('Error toggling favorite:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
};
