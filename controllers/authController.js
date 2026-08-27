const User = require('../models/User');
const bcrypt = require('bcrypt');

exports.getLogin = (req, res) => {
    res.render('login', { error: null });
};

exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = {
                _id: user._id,
                name: user.fullName || user.name,
                email: user.email,
                role: user.role
            };
            
            return req.session.save(err => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.render('login', { error: 'Giriş yapılırken bir hata oluştu.' });
                }
                if (user.role === 'admin') {
                    return res.redirect('/admin');
                }
                return res.redirect('/');
            });
        }
        
        res.render('login', { error: 'Hatalı e-posta veya şifre.' });
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Bir hata oluştu.' });
    }
};

exports.getRegister = (req, res) => {
    res.render('register', { error: null });
};

exports.postRegister = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
            return res.render('register', { error: 'Bu e-posta adresi zaten kullanımda.' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });
        
        await newUser.save();
        res.redirect('/auth/login');
    } catch (err) {
        console.error(err);
        res.render('register', { error: 'Bir hata oluştu.' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.redirect('/');
    });
};
