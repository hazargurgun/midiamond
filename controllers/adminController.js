const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Banner = require('../models/Banner');
const Category = require('../models/Category');
const Message = require('../models/Message');
const HomeSetting = require('../models/HomeSetting');
const HomeSection = require('../models/HomeSection');

// Support / Chat Methods
exports.getSupport = async (req, res) => {
    try {
        // Hem gönderen hem de alan tarafında kullanıcıyı ara (Admin olmayan taraf)
        const sentUsers = await Message.distinct('sender', { isAdminSender: false });
        const receivedUsers = await Message.distinct('receiver', { isAdminSender: true });

        // Benzersiz kullanıcı ID'lerini birleştir
        const allUserIds = [...new Set([...sentUsers, ...receivedUsers])].filter(id => id != null);

        const users = await User.find({ _id: { $in: allUserIds } });

        res.render('admin/support', { users });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.getUserMessages = async (req, res) => {
    try {
        const userId = req.params.userId;
        const messages = await Message.find({
            $or: [
                { sender: userId },
                { receiver: userId }
            ]
        }).sort({ createdAt: 1 });

        const user = await User.findById(userId);
        res.json({ success: true, messages, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendAdminMessage = async (req, res) => {
    try {
        const { userId, content } = req.body;
        const newMessage = new Message({
            receiver: userId,
            isAdminSender: true,
            content
        });

        await newMessage.save();
        res.json({ success: true, message: newMessage });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteChatMessage = async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.editChatMessage = async (req, res) => {
    try {
        const { content } = req.body;
        await Message.findByIdAndUpdate(req.params.id, { content });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.endChat = async (req, res) => {
    try {
        const userId = req.params.userId;
        // Tüm mesajları sil (Kullanıcı bir daha göremesin diye)
        await Message.deleteMany({
            $or: [
                { sender: userId },
                { receiver: userId }
            ]
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};





exports.getDashboard = async (req, res) => {
    try {
        const productCount = await Product.countDocuments();
        const orderCount = await Order.countDocuments();
        const userCount = await User.countDocuments();
        const recentOrders = await Order.find().populate('user').sort({ createdAt: -1 }).limit(5);

        res.render('admin/dashboard', {
            productCount,
            orderCount,
            userCount,
            recentOrders
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
};

exports.getLogin = (req, res) => {
    res.render('admin/login', { error: null });
};

exports.postLogin = (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        return req.session.save(err => {
            if (err) console.error(err);
            res.redirect('/admin');
        });
    }
    res.render('admin/login', { error: 'Hatalı şifre!' });
};

// Ürün Yönetimi
exports.getProducts = async (req, res) => {
    const products = await Product.find().populate('categories').sort({ createdAt: -1 });
    const categories = await Category.find().sort({ name: 1 });
    res.render('admin/products', { products, categories });
};

// Helper to clean and parse Turkish formatted prices elegantly
const parseTurkishPrice = (priceVal) => {
    if (priceVal === undefined || priceVal === null || priceVal === '') return 0;
    if (typeof priceVal === 'number') return priceVal;

    let cleaned = priceVal.toString().trim();

    // If there is both a dot and a comma, remove the dot and replace the comma with a dot
    if (cleaned.includes('.') && cleaned.includes(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    }
    // If there is only a dot and it's followed by exactly 3 digits, it's a thousands separator (e.g., "30.000")
    else if (cleaned.includes('.') && !cleaned.includes(',')) {
        const parts = cleaned.split('.');
        const lastPart = parts[parts.length - 1];
        if (lastPart.length === 3) {
            cleaned = cleaned.replace(/\./g, '');
        }
    }
    // If there is only a comma, replace it with a dot
    else if (cleaned.includes(',') && !cleaned.includes('.')) {
        cleaned = cleaned.replace(/,/g, '.');
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};


// AJAX ile tek dosyayı Cloudflare R2'ye yükler ve public URL döner
exports.uploadTemp = async (req, res) => {
    try {
        if (req.file) {
            return res.json({ success: true, url: req.file.path });
        }
        res.json({ success: false, message: 'Dosya bulunamadı.' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.addProduct = async (req, res) => {
    try {
        const {
            name, description, price, category, categories: categoriesInput, stock, isPopular,
            existingImages, existingImagesOrder, videoUrl, videoOrder,
            productCode, metal, metalColor, gemType, caratWeight,
            gemColor, gemClarity, gemCut, certificate
        } = req.body;

        // Ana görsel: doğrudan dosya yüklemesi (multer → R2)
        let imageUrl = '/uploads/premium_diamond_ring.png';
        if (req.file) {
            imageUrl = req.file.path;
        }

        // Galeri görselleri: AJAX ile önceden yüklendi, body'den URL olarak gelir
        let images = [];
        if (existingImages) {
            const keptImages = Array.isArray(existingImages) ? existingImages : [existingImages];
            const keptImagesOrder = existingImagesOrder
                ? (Array.isArray(existingImagesOrder) ? existingImagesOrder : [existingImagesOrder])
                : [];
            keptImages.forEach((url, index) => {
                if (!url) return;
                const orderVal = (keptImagesOrder[index] !== undefined && keptImagesOrder[index] !== '')
                    ? parseInt(keptImagesOrder[index]) : index;
                images.push({ url, order: orderVal });
            });
        }

        // Video URL: AJAX ön-yükleme ile R2'ye yüklendi (dizi gelirse ilkini/sonuncusunu alarak güvence altına alıyoruz)
        let finalVideoUrl = '';
        if (videoUrl) {
            if (Array.isArray(videoUrl)) {
                finalVideoUrl = videoUrl.filter(v => v && v !== '').pop() || '';
            } else {
                finalVideoUrl = videoUrl;
            }
        }
        const parsedVideoOrder = (videoOrder !== undefined && videoOrder !== '') ? parseInt(videoOrder) : 99;

        const parsedPrice = parseTurkishPrice(price);

        // Karat hesaplama aralığı (tek karat için)
        let parsedCarat = null;
        let caratRange = '';
        if (caratWeight && caratWeight !== '') {
            parsedCarat = parseFloat(caratWeight);
            if (!isNaN(parsedCarat)) {
                if (parsedCarat < 0.5) caratRange = 'under0.5';
                else if (parsedCarat < 1.0) caratRange = '0.5-1';
                else caratRange = '1plus';
            } else {
                parsedCarat = null;
            }
        }

        // Çoklu karat seçeneklerini işle
        let caratOptions = [];
        const caratCarats = req.body.caratOptionsCarats;
        const caratPrices = req.body.caratOptionsPrices;
        if (caratCarats) {
            const caratsArr = Array.isArray(caratCarats) ? caratCarats : [caratCarats];
            const pricesArr = caratPrices ? (Array.isArray(caratPrices) ? caratPrices : [caratPrices]) : [];
            caratsArr.forEach((c, i) => {
                const cVal = parseFloat(c);
                const pVal = parseTurkishPrice(pricesArr[i] || '0');
                if (!isNaN(cVal) && cVal > 0) {
                    caratOptions.push({ carat: cVal, price: pVal });
                }
            });
        }

        // categories can come as categories (array) or category (single)
        const rawCategories = categoriesInput || category;
        const categoriesArr = rawCategories ? (Array.isArray(rawCategories) ? rawCategories : [rawCategories]) : [];

        const newProduct = new Product({
            name, description, price: parsedPrice, categories: categoriesArr, stock,
            imageUrl, images,
            videoUrl: finalVideoUrl,
            videoOrder: parsedVideoOrder,
            isPopular: isPopular === 'on',
            productCode: productCode || '',
            metal: metal || '',
            metalColor: metalColor || '',
            gemType: gemType || '',
            caratWeight: parsedCarat,
            caratRange,
            caratOptions,
            gemColor: gemColor || '',
            gemClarity: gemClarity || '',
            gemCut: gemCut || '',
            certificate: certificate || ''
        });
        await newProduct.save();
        res.redirect('/admin/products?msg=success');
    } catch (err) {
        console.error('ADD PRODUCT ERROR:', err);
        res.redirect('/admin/products?msg=error');
    }
};

exports.editProduct = async (req, res) => {
    try {
        const {
            name, description, price, category, categories: categoriesInput, stock, isPopular,
            existingImages, videoUrl, videoOrder, deleteVideo,
            productCode, metal, metalColor, gemType, caratWeight,
            gemColor, gemClarity, gemCut, certificate
        } = req.body;

        const parsedPrice = parseTurkishPrice(price);

        let parsedCarat = null;
        let caratRange = '';
        if (caratWeight && caratWeight !== '') {
            parsedCarat = parseFloat(caratWeight);
            if (!isNaN(parsedCarat)) {
                if (parsedCarat < 0.5) caratRange = 'under0.5';
                else if (parsedCarat < 1.0) caratRange = '0.5-1';
                else caratRange = '1plus';
            } else {
                parsedCarat = null;
            }
        }

        // Çoklu karat seçeneklerini işle
        let caratOptions = [];
        const caratCarats = req.body.caratOptionsCarats;
        const caratPrices = req.body.caratOptionsPrices;
        if (caratCarats) {
            const caratsArr = Array.isArray(caratCarats) ? caratCarats : [caratCarats];
            const pricesArr = caratPrices ? (Array.isArray(caratPrices) ? caratPrices : [caratPrices]) : [];
            caratsArr.forEach((c, i) => {
                const cVal = parseFloat(c);
                const pVal = parseTurkishPrice(pricesArr[i] || '0');
                if (!isNaN(cVal) && cVal > 0) {
                    caratOptions.push({ carat: cVal, price: pVal });
                }
            });
        }

        // handle categories input (either categories[] or category)
        const rawCategoriesEdit = categoriesInput || category;
        const categoriesArrEdit = rawCategoriesEdit ? (Array.isArray(rawCategoriesEdit) ? rawCategoriesEdit : [rawCategoriesEdit]) : [];

        let updateData = {
            name, description, price: parsedPrice, categories: categoriesArrEdit, stock,
            isPopular: isPopular === 'on',
            productCode: productCode || '',
            metal: metal || '',
            metalColor: metalColor || '',
            gemType: gemType || '',
            caratWeight: parsedCarat,
            caratRange,
            caratOptions,
            gemColor: gemColor || '',
            gemClarity: gemClarity || '',
            gemCut: gemCut || '',
            certificate: certificate || ''
        };

        // Ana görsel değiştirildiyse (multer → R2)
        if (req.file) {
            updateData.imageUrl = req.file.path;
        }

        // Mevcut görselleri sıralı dizi olarak al (drag-drop'tan gelen URL'ler)
        let images = [];
        if (existingImages) {
            const keptImages = Array.isArray(existingImages) ? existingImages : [existingImages];
            const keptImagesOrder = req.body.existingImagesOrder
                ? (Array.isArray(req.body.existingImagesOrder) ? req.body.existingImagesOrder : [req.body.existingImagesOrder])
                : [];
            keptImages.forEach((url, index) => {
                if (!url) return;
                const orderVal = (keptImagesOrder && keptImagesOrder[index] !== undefined && keptImagesOrder[index] !== '')
                    ? parseInt(keptImagesOrder[index]) : index;
                images.push({ url, order: orderVal });
            });
        }
        updateData.images = images;

        // Video: silinecekse temizle, aksi halde body'den gelen URL'yi kullan
        if (deleteVideo === 'true') {
            updateData.videoUrl = '';
            updateData.videoOrder = 99;
        } else {
            if (videoUrl) {
                if (Array.isArray(videoUrl)) {
                    updateData.videoUrl = videoUrl.filter(v => v && v !== '').pop() || '';
                } else {
                    updateData.videoUrl = videoUrl;
                }
            }
            if (videoOrder !== undefined && videoOrder !== '') {
                updateData.videoOrder = parseInt(videoOrder);
            }
        }

        await Product.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin/products');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/products');
    }
};

exports.deleteProduct = async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin/products');
};

// Sipariş Yönetimi
exports.getOrders = async (req, res) => {
    const orders = await Order.find().populate('user').populate('items.product').sort({ createdAt: -1 });
    res.render('admin/orders', { orders });
};

exports.updateOrderStatus = async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { orderStatus: req.body.status });
    res.redirect('/admin/orders');
};

// Kullanıcı Yönetimi
exports.getUsers = async (req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    res.render('admin/users', { users });
};

exports.deleteUser = async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/admin/users');
};

// Banner/Slider Yönetimi
exports.getBanners = async (req, res) => {
    // Mevcut bannerlara isActive alanını ekle (varsayılan true)
    await Banner.updateMany(
        { isActive: { $exists: false } },
        { $set: { isActive: true } }
    );
    
    const banners = await Banner.find().sort({ order: 1 });
    res.render('admin/banners', { banners });
};

exports.addBanner = async (req, res) => {
    try {
        const { type, imageUrl: textImageUrl, title, subtitle, link, order, desktopHeight, mobileHeight, isActive } = req.body;
        let imageUrl = textImageUrl || '';
        let mobileImageUrl = '';

        if (req.files) {
            if (req.files['imageFile'] && req.files['imageFile'][0]) {
                imageUrl = req.files['imageFile'][0].path;
            }
            if (req.files['mobileImageFile'] && req.files['mobileImageFile'][0]) {
                mobileImageUrl = req.files['mobileImageFile'][0].path;
            }
        }

        const newBanner = new Banner({
            type,
            imageUrl,
            mobileImageUrl,
            title,
            subtitle,
            link,
            order,
            desktopHeight: desktopHeight || '980px',
            mobileHeight: mobileHeight || '124vw',
            isActive: isActive === 'on'
        });
        await newBanner.save();
        res.redirect('/admin/banners?msg=success');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/banners?msg=error');
    }
};

exports.editBanner = async (req, res) => {
    try {
        const { type, title, subtitle, link, order, desktopHeight, mobileHeight, isActive } = req.body;
        const bannerId = req.params.id;

        const banner = await Banner.findById(bannerId);
        if (!banner) {
            return res.redirect('/admin/banners?error=notfound');
        }

        let imageUrl = banner.imageUrl;
        let mobileImageUrl = banner.mobileImageUrl;

        if (req.files) {
            if (req.files['imageFile'] && req.files['imageFile'][0]) {
                imageUrl = req.files['imageFile'][0].path;
            }
            if (req.files['mobileImageFile'] && req.files['mobileImageFile'][0]) {
                mobileImageUrl = req.files['mobileImageFile'][0].path;
            }
        }

        banner.type = type;
        banner.imageUrl = imageUrl;
        banner.mobileImageUrl = mobileImageUrl;
        banner.title = title;
        banner.subtitle = subtitle;
        banner.link = link || '/shop';
        banner.order = parseInt(order) || 0;
        banner.desktopHeight = desktopHeight || '980px';
        banner.mobileHeight = mobileHeight || '124vw';
        banner.isActive = isActive === 'on';

        await banner.save();
        res.redirect('/admin/banners?msg=success');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/banners?msg=error');
    }
};

exports.deleteBanner = async (req, res) => {
    await Banner.findByIdAndDelete(req.params.id);
    res.redirect('/admin/banners?msg=success');
};

exports.toggleBannerActive = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.redirect('/admin/banners?msg=error');
        }
        banner.isActive = !banner.isActive;
        await banner.save();
        res.redirect('/admin/banners?msg=success');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/banners?msg=error');
    }
};

// Kategori Yönetimi
exports.getCategories = async (req, res) => {
    const categories = await Category.find().sort({ order: 1, name: 1 });
    res.render('admin/categories', { categories });
};

exports.addCategory = async (req, res) => {
    try {
        const { name, order } = req.body;
        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        const newCategory = new Category({
            name,
            slug,
            order: parseInt(order) || 0
        });
        await newCategory.save();
        res.redirect('/admin/categories');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/categories');
    }
};

exports.editCategory = async (req, res) => {
    try {
        const { name, order } = req.body;
        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        await Category.findByIdAndUpdate(req.params.id, {
            name,
            slug,
            order: parseInt(order) || 0
        });
        res.redirect('/admin/categories');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/categories');
    }
};

exports.deleteCategory = async (req, res) => {
    await Category.findByIdAndDelete(req.params.id);
    res.redirect('/admin/categories');
};

// Anasayfa Ayarları
exports.getHomeSettings = async (req, res) => {
    try {
        // En az 1 ayar belgesi olduğundan emin ol
        let setting = await HomeSetting.findOne();
        if (!setting) {
            setting = new HomeSetting();
            await setting.save();
        }

        const sections = await HomeSection.find().populate('products').sort({ order: 1 });
        const products = await Product.find().sort({ name: 1 });
        const categories = await Category.find().sort({ order: 1, name: 1 });

        res.render('admin/home_settings', {
            setting,
            sections,
            products,
            categories
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
};

exports.updateHomeSettings = async (req, res) => {
    try {
        const {
            newArrivalTitle,
            service1Title, service1Desc,
            service2Title, service2Desc,
            service3Title, service3Desc,
            service4Title, service4Desc,
            promoNav1Label, promoNav1Category,
            promoNav2Label, promoNav2Category,
            promoNav3Label, promoNav3Category,
            promoNav4Label, promoNav4Category,
            promoNav5Label, promoNav5Category
        } = req.body;

        let setting = await HomeSetting.findOne();
        if (!setting) {
            setting = new HomeSetting();
        }

        setting.newArrivalTitle = newArrivalTitle;
        setting.service1Title = service1Title;
        setting.service1Desc = service1Desc;
        setting.service2Title = service2Title;
        setting.service2Desc = service2Desc;
        setting.service3Title = service3Title;
        setting.service3Desc = service3Desc;
        setting.service4Title = service4Title;
        setting.service4Desc = service4Desc;
        setting.promoNav1Label = promoNav1Label || '';
        setting.promoNav1Category = promoNav1Category || '';
        setting.promoNav2Label = promoNav2Label || '';
        setting.promoNav2Category = promoNav2Category || '';
        setting.promoNav3Label = promoNav3Label || '';
        setting.promoNav3Category = promoNav3Category || '';
        setting.promoNav4Label = promoNav4Label || '';
        setting.promoNav4Category = promoNav4Category || '';
        setting.promoNav5Label = promoNav5Label || '';
        setting.promoNav5Category = promoNav5Category || '';

        await setting.save();
        res.redirect('/admin/home-settings?msg=success');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/home-settings?msg=error');
    }
};

// Dinamik Bölüm Yönetimi
exports.addHomeSection = async (req, res) => {
    try {
        const { title, order, products } = req.body;
        const productIds = products
            ? (Array.isArray(products) ? products : [products])
            : [];

        const newSection = new HomeSection({
            title,
            order: parseInt(order) || 0,
            products: productIds
        });

        await newSection.save();
        res.redirect('/admin/home-settings?msg=success');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/home-settings?msg=error');
    }
};

exports.editHomeSection = async (req, res) => {
    try {
        const { title, order, products } = req.body;
        const productIds = products
            ? (Array.isArray(products) ? products : [products])
            : [];

        await HomeSection.findByIdAndUpdate(req.params.id, {
            title,
            order: parseInt(order) || 0,
            products: productIds
        });

        res.redirect('/admin/home-settings?msg=success');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/home-settings?msg=error');
    }
};

exports.deleteHomeSection = async (req, res) => {
    try {
        await HomeSection.findByIdAndDelete(req.params.id);
        res.redirect('/admin/home-settings?msg=success');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/home-settings?msg=error');
    }
};
