const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' });

async function seedAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB'ye bağlanıldı.");

        const adminExists = await User.findOne({ email: 'admin@admin.com' });
        if (adminExists) {
            console.log('Admin kullanıcısı zaten mevcut.');
            process.exit();
        }

        const hashedPassword = await bcrypt.hash('admin123', 10);
        const adminUser = new User({
            name: 'Admin',
            email: 'admin@admin.com',
            password: hashedPassword,
            role: 'admin'
        });

        await adminUser.save();
        console.log('Admin kullanıcısı başarıyla oluşturuldu.');
        console.log('E-posta: admin@admin.com');
        console.log('Şifre: admin123');
        process.exit();
    } catch (err) {
        console.error('Hata:', err);
        process.exit(1);
    }
}

seedAdmin();
