const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config({ path: '../.env' });

const testProducts = [
    {
        name: '22 Ayar Altın Yüzük',
        description: 'Zarif tasarımıyla her ana eşlik edecek klasik altın yüzük.',
        price: 8500,
        category: 'Yüzük',
        stock: 10,
        imageUrl: '/assets/img/gallery/popular1.png',
        isPopular: true
    },
    {
        name: 'Pırlanta Tektaş Kolye',
        description: 'Işıltısıyla göz kamaştıran 0.25 karat pırlanta kolye.',
        price: 12400,
        category: 'Kolye',
        stock: 5,
        imageUrl: '/assets/img/gallery/popular2.png',
        isPopular: true
    },
    {
        name: 'Gümüş Tasarım Küpe',
        description: 'Modern çizgileriyle günlük şıklığın anahtarı.',
        price: 1200,
        category: 'Küpe',
        stock: 20,
        imageUrl: '/assets/img/gallery/popular3.png',
        isPopular: true
    },
    {
        name: 'Safir Taşlı Bileklik',
        description: 'Derin mavi safir taşların gümüşle buluşması.',
        price: 4500,
        category: 'Bileklik',
        stock: 8,
        imageUrl: '/assets/img/gallery/popular4.png',
        isPopular: true
    },
    {
        name: 'Klasik Erkek Kol Saati',
        description: 'Çelik kasa ve deri kordonun mükemmel uyumu.',
        price: 3200,
        category: 'Saat',
        stock: 15,
        imageUrl: '/assets/img/gallery/arrival1.png',
        isPopular: false
    },
    {
        name: 'İnci Küpe Seti',
        description: 'Doğal inci zarafetiyle tanışın.',
        price: 2800,
        category: 'Küpe',
        stock: 12,
        imageUrl: '/assets/img/gallery/arrival2.png',
        isPopular: false
    },
    {
        name: 'Yakut Taşlı Kolye',
        description: 'Kırmızının en asil hali yakut taşlı kolye.',
        price: 9500,
        category: 'Kolye',
        stock: 3,
        imageUrl: '/assets/img/gallery/arrival3.png',
        isPopular: false
    },
    {
        name: 'Zümrüt Detaylı Yüzük',
        description: 'Doğanın yeşilini parmağınızda taşıyın.',
        price: 11000,
        category: 'Yüzük',
        stock: 4,
        imageUrl: '/assets/img/gallery/arrival4.png',
        isPopular: false
    },
    {
        name: 'Minimalist Altın Bileklik',
        description: 'İnce ve zarif 14 ayar altın bileklik.',
        price: 5200,
        category: 'Bileklik',
        stock: 15,
        imageUrl: '/assets/img/gallery/arrival5.png',
        isPopular: false
    }
];

async function seedProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB'ye bağlanıldı.");

        await Product.deleteMany({}); // Mevcut ürünleri temizle
        console.log('Eski ürünler temizlendi.');

        await Product.insertMany(testProducts);
        console.log('Test ürünleri başarıyla eklendi.');
        
        process.exit();
    } catch (err) {
        console.error('Hata:', err);
        process.exit(1);
    }
}

seedProducts();
