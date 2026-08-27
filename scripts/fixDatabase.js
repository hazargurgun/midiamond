const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
require('dotenv').config({ path: '../.env' });

const initialCategories = [
    { name: 'Yüzükler', slug: 'yuzukler' },
    { name: 'Kolyeler', slug: 'kolyeler' },
    { name: 'Küpeler', slug: 'kupeler' },
    { name: 'Bileklikler', slug: 'bileklikler' },
    { name: 'Saatler', slug: 'saatler' }
];

async function fixDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB'ye bağlanıldı.");

        // Kategorileri oluştur
        await Category.deleteMany({});
        const createdCategories = await Category.insertMany(initialCategories);
        console.log('Kategoriler oluşturuldu.');

        // Mevcut ürünleri temizle ve yeniden oluştur (Çünkü tip değişti)
        await Product.deleteMany({});
        console.log('Eski ürünler temizlendi.');

        // Yeni ürünleri doğru kategorilerle ekle
        const testProducts = [
            {
                name: '22 Ayar Altın Yüzük',
                description: 'Zarif tasarımıyla her ana eşlik edecek klasik altın yüzük.',
                price: 8500,
                category: createdCategories.find(c => c.slug === 'yuzukler')._id,
                stock: 10,
                imageUrl: '/assets/img/gallery/popular1.png',
                isPopular: true
            },
            {
                name: 'Pırlanta Tektaş Kolye',
                description: 'Işıltısıyla göz kamaştıran 0.25 karat pırlanta kolye.',
                price: 12400,
                category: createdCategories.find(c => c.slug === 'kolyeler')._id,
                stock: 5,
                imageUrl: '/assets/img/gallery/popular2.png',
                isPopular: true
            },
            {
                name: 'Gümüş Tasarım Küpe',
                description: 'Modern çizgileriyle günlük şıklığın anahtarı.',
                price: 1200,
                category: createdCategories.find(c => c.slug === 'kupeler')._id,
                stock: 20,
                imageUrl: '/assets/img/gallery/popular3.png',
                isPopular: true
            },
            {
                name: 'Safir Taşlı Bileklik',
                description: 'Derin mavi safir taşların gümüşle buluşması.',
                price: 4500,
                category: createdCategories.find(c => c.slug === 'bileklikler')._id,
                stock: 8,
                imageUrl: '/assets/img/gallery/popular4.png',
                isPopular: true
            }
        ];

        await Product.insertMany(testProducts);
        console.log('Test ürünleri yeni kategori yapısıyla eklendi.');

        process.exit();
    } catch (err) {
        console.error('Hata:', err);
        process.exit(1);
    }
}

fixDatabase();
