const Product = require('../models/Product');
const Banner = require('../models/Banner');
const Category = require('../models/Category');
const HomeSetting = require('../models/HomeSetting');
const HomeSection = require('../models/HomeSection');

exports.getHome = async (req, res) => {
    try {
        // Mevcut bannerlara isActive alanını ekle (varsayılan true)
        await Banner.updateMany(
            { isActive: { $exists: false } },
            { $set: { isActive: true } }
        );

        const products = await Product.find().sort({ createdAt: -1 }).limit(100);
        const popularProducts = await Product.find({ isPopular: true }).limit(5);
        const heroBanners = await Banner.find({ type: 'hero', isActive: true }).sort({ order: 1 });
        const middleBanners = await Banner.find({ type: 'middle', isActive: true }).sort({ order: 1 });
        const categories = await Category.find().sort({ order: 1, name: 1 });

        let setting = await HomeSetting.findOne();
        if (!setting) {
            setting = new HomeSetting();
            await setting.save();
        }

        const sections = await HomeSection.find().populate('products').sort({ order: 1 });

        res.render('index', {
            products,
            popularProducts,
            heroBanners,
            middleBanners,
            categories,
            setting,
            sections
        });
    } catch (err) {
        console.error(err);
        res.render('index', {
            products: [],
            popularProducts: [],
            heroBanners: [],
            middleBanners: [],
            categories: [],
            setting: new HomeSetting(),
            sections: []
        });
    }
};

exports.getShop = async (req, res) => {
    try {
        const { category, karat, renk, berraklik, kesim, metal, sertifika, ara, q } = req.query;
        let query = {};
        let pageTitle = 'Mağaza';

        const categories = await Category.find().sort({ name: 1 });

        // Kategori filtresi
        if (category) {
            const catObj = await Category.findOne({ slug: category });
            if (catObj) {
                query.categories = catObj._id;
                pageTitle = catObj.name;
            }
        }

        // Arama (isim veya ürün kodu)
        const araVal = (ara || q || '').trim();
        if (araVal !== '') {
            const searchRegex = new RegExp(araVal, 'i');
            query.$or = [
                { name: searchRegex },
                { productCode: searchRegex }
            ];
        }

        // Karat aralığı filtresi
        if (karat) {
            if (karat === 'under0.5') query.caratRange = 'under0.5';
            else if (karat === '0.5-1') query.caratRange = '0.5-1';
            else if (karat === '1plus') query.caratRange = '1plus';
        }

        // Taş rengi filtresi
        if (renk) query.gemColor = renk;

        // Berraklık filtresi
        if (berraklik) query.gemClarity = berraklik;

        // Kesim filtresi
        if (kesim) query.gemCut = kesim;

        // Metal filtresi
        if (metal) query.metal = metal;

        // Sertifika filtresi
        if (sertifika) query.certificate = sertifika;

        const products = await Product.find(query).populate('categories').sort({ createdAt: -1 });
        res.render('shop', {
            products, categories,
            currentCategory: category || 'Hepsi',
            pageTitle,
            activeFilters: { karat, renk, berraklik, kesim, metal, sertifika, ara: araVal }
        });
    } catch (err) {
        console.error(err);
        res.render('shop', { products: [], categories: [], currentCategory: 'Hepsi', pageTitle: 'Mağaza', activeFilters: {} });
    }
};

exports.getCategory = async (req, res) => {
    try {
        const slug = req.params.slug;
        const catObj = await Category.findOne({ slug });
        if (!catObj) return res.redirect('/shop');

        const categories = await Category.find().sort({ name: 1 });
        const products = await Product.find({ categories: catObj._id }).populate('categories').sort({ createdAt: -1 });

        res.render('shop', {
            products,
            categories,
            currentCategory: slug,
            pageTitle: catObj.name,
            activeFilters: {}
        });
    } catch (err) {
        console.error(err);
        res.redirect('/shop');
    }
};

exports.getProductDetails = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.redirect('/shop');
        }
        const product = await Product.findById(req.params.id);
        if (!product) return res.redirect('/shop');
        res.render('product_details', { product });
    } catch (err) {
        console.error(err);
        res.redirect('/shop');
    }
};

exports.getAbout = (req, res) => {
    res.render('about');
};

exports.getContact = (req, res) => {
    res.render('contact');
};

// Cart Methods
exports.getCart = (req, res) => {
    res.render('cart');
};

exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity, selectedCarat, selectedSize } = req.body;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }

        const qty = parseInt(quantity) || 1;
        const caratVal = selectedCarat ? parseFloat(selectedCarat) : null;
        const sizeVal = selectedSize ? selectedSize.toString().trim() : null;

        // Karat seçeneğine göre birim fiyat belirleme
        let itemPrice = product.price;
        if (caratVal && product.caratOptions && product.caratOptions.length > 0) {
            const opt = product.caratOptions.find(o => o.carat === caratVal);
            if (opt) {
                itemPrice = opt.price;
            }
        }

        const cart = req.session.cart || [];
        // Hem ürün ID'si hem de seçilen karat ve yüzük ölçüsü eşleşmelidir
        const existingItemIndex = cart.findIndex(item =>
            item.productId === productId &&
            (caratVal ? item.selectedCarat === caratVal : !item.selectedCarat) &&
            (sizeVal ? item.selectedSize === sizeVal : !item.selectedSize)
        );

        if (existingItemIndex >= 0) {
            cart[existingItemIndex].quantity += qty;
        } else {
            cart.push({
                productId: product._id.toString(),
                name: product.name,
                price: itemPrice,
                imageUrl: product.imageUrl,
                selectedCarat: caratVal,
                selectedSize: sizeVal,
                quantity: qty
            });
        }

        req.session.cart = cart;
        res.json({ success: true, message: 'Ürün sepete eklendi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
};

exports.removeFromCart = (req, res) => {
    try {
        const { productId, selectedCarat, selectedSize } = req.body;
        const caratVal = selectedCarat ? parseFloat(selectedCarat) : null;
        const sizeVal = selectedSize ? selectedSize.toString().trim() : null;

        if (req.session.cart) {
            req.session.cart = req.session.cart.filter(item => {
                const isSameProduct = item.productId === productId;
                const isSameCarat = caratVal ? (item.selectedCarat === caratVal) : (!item.selectedCarat);
                const isSameSize = sizeVal ? (item.selectedSize === sizeVal) : (!item.selectedSize);
                // Eşleşen satırı çıkart
                return !(isSameProduct && isSameCarat && isSameSize);
            });
        }
        res.redirect('/cart');
    } catch (err) {
        console.error(err);
        res.redirect('/cart');
    }
};

// Checkout Methods
exports.getCheckout = (req, res) => {
    // Check if cart is empty
    if (!req.session.cart || req.session.cart.length === 0) {
        return res.redirect('/cart');
    }

    res.render('checkout');
};

exports.getRingSizeFinder = (req, res) => {
    res.render('yuzuk_olcusu', { embed: req.query.embed === 'true' });
};
