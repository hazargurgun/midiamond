const mongoose = require('mongoose');
const Banner = require('../models/Banner');
require('dotenv').config({ path: '../.env' });

const testBanners = [
    {
        type: 'hero',
        imageUrl: '/assets/img/gallery/section_bg01.png',
        title: 'Zarafet ve Şıklık\nBir Arada',
        subtitle: 'Koleksiyonu Keşfet',
        link: '/shop',
        order: 1
    },
    {
        type: 'hero',
        imageUrl: '/assets/img/gallery/about1.png',
        title: 'En Özel Anlarınıza\nDeğer Katıyoruz',
        subtitle: 'Şimdi Al',
        link: '/shop',
        order: 2
    },
    {
        type: 'middle',
        imageUrl: '/assets/img/gallery/popular-itmes.png',
        title: 'Eşsiz Koleksiyonlarımızla Tanışın',
        subtitle: 'Hakkımızda',
        link: '/about',
        order: 1
    }
];

async function seedBanners() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB'ye bağlanıldı.");

        await Banner.deleteMany({});
        console.log('Eski bannerlar temizlendi.');

        await Banner.insertMany(testBanners);
        console.log('Test bannerları başarıyla eklendi.');
        
        process.exit();
    } catch (err) {
        console.error('Hata:', err);
        process.exit(1);
    }
}

seedBanners();
