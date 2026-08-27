const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
require('dotenv').config();

const app = express();
const chatController = require('./controllers/chatController');
const mediaUrl = require('./utils/mediaUrl');
app.locals.mediaUrl = mediaUrl;

const PORT = process.env.PORT || 3000;

// Trust proxy settings (for Cloudflare, Nginx, etc.)
app.set('trust proxy', true);

// ------------------------------
// 1. BODY PARSER'İ EN BAŞTA ÇALIŞTIR!
// ------------------------------
// PayTR x-www-form-urlencoded gönderir, bunu önce çözmeliyiz
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// ------------------------------
// 2. SONRA PAYTR CALLBACK'İNİ ÇALIŞTIR!
// ------------------------------
const paymentController = require('./controllers/paymentController');
app.post('/payment/callback', paymentController.paymentCallback);
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('IP:', req.ip);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body || {}, null, 2));
    next();
});
// Cache static files for better performance
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: false,
    lastModified: false
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: (MongoStore.create || MongoStore.default.create)({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
        secure: isProduction,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Global variables for views
app.use(async (req, res, next) => {
    res.locals.user = req.session.user || null;

    // Fetch user favorites if logged in
    res.locals.userFavorites = [];
    if (req.session.user) {
        try {
            const User = require('./models/User');
            const currentUser = await User.findById(req.session.user._id);
            if (currentUser && currentUser.favorites) {
                res.locals.userFavorites = currentUser.favorites.map(id => id.toString());
            }
        } catch (err) {
            console.error('Error fetching global favorites:', err);
        }
    }

    // Initialize cart if not exists
    if (!req.session.cart) {
        req.session.cart = [];
    }
    res.locals.cart = req.session.cart;

    // Calculate total count and amount
    let cartCount = 0;
    let cartTotal = 0;
    req.session.cart.forEach(item => {
        cartCount += item.quantity;
        cartTotal += (item.price * item.quantity);
    });
    res.locals.cartCount = cartCount;
    res.locals.cartTotal = cartTotal;

    try {
        const Category = require('./models/Category');
        res.locals.globalCategories = await Category.find().sort({ order: 1, name: 1 });
    } catch (err) {
        res.locals.globalCategories = [];
    }

    try {
        const HomeSetting = require('./models/HomeSetting');
        let setting = await HomeSetting.findOne();
        if (!setting) {
            setting = new HomeSetting();
            await setting.save();
        }
        res.locals.globalSetting = setting;
    } catch (err) {
        res.locals.globalSetting = {};
    }

    next();
});

// Chat Routes
app.get('/chat/messages', chatController.getMessages);
app.post('/chat/send', chatController.sendMessage);

// Routes
app.use('/', require('./routes/indexRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/auth', require('./routes/authRoutes'));
app.use('/payment', require('./routes/paymentRoutes'));
app.use('/user', require('./routes/userRoutes'));

// Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.send('<script>alert("Hata: Dosya boyutu çok büyük! (Maksimum 50MB)"); window.history.back();</script>');
    }
    if (req.path.startsWith('/admin')) {
        return res.redirect('/admin/products?msg=error');
    }
    res.status(500).send('Bir hata oluştu!');
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB veritabanına başarıyla bağlanıldı.');
        app.listen(PORT, () => {
            console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
        });
    })
    .catch(err => {
        console.error('MongoDB bağlantı hatası:', err.message);
        console.log('Lütfen .env dosyasındaki MONGODB_URI adresini kontrol edin.');
        // Veritabanı olmadan da sunucuyu test edebilmek için geçici olarak başlatıyoruz
        app.listen(PORT, () => {
            console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor (MongoDB BAĞLANTISI YOK).`);
        });
    });
