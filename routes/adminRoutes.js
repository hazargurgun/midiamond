const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const isAdmin = require('../controllers/isAdmin');
const upload = require('../middlewares/upload');
const { sendToR2 } = upload;

router.get('/login', adminController.getLogin);
router.post('/login', adminController.postLogin);

router.use(isAdmin); // Diğer tüm admin rotaları için isAdmin kontrolü

router.get('/', adminController.getDashboard);
router.get('/products', adminController.getProducts);

// AJAX ön-yükleme: tek dosyayı R2'ye yükler, public URL döner
router.post('/upload-temp', upload.single('file'), sendToR2, adminController.uploadTemp);

router.post('/products/add', upload.single('imageFile'), sendToR2, adminController.addProduct);
router.post('/products/edit/:id', upload.single('imageFile'), sendToR2, adminController.editProduct);
router.get('/products/delete/:id', adminController.deleteProduct);

router.get('/orders', adminController.getOrders);
router.post('/orders/update/:id', adminController.updateOrderStatus);

router.get('/users', adminController.getUsers);
router.get('/users/delete/:id', adminController.deleteUser);

router.get('/banners', adminController.getBanners);
router.post('/banners/add', upload.fields([{ name: 'imageFile', maxCount: 1 }, { name: 'mobileImageFile', maxCount: 1 }]), sendToR2, adminController.addBanner);
router.post('/banners/edit/:id', upload.fields([{ name: 'imageFile', maxCount: 1 }, { name: 'mobileImageFile', maxCount: 1 }]), sendToR2, adminController.editBanner);
router.get('/banners/delete/:id', adminController.deleteBanner);
router.get('/banners/toggle/:id', adminController.toggleBannerActive);

router.get('/categories', adminController.getCategories);
router.post('/categories/add', adminController.addCategory);
router.post('/categories/edit/:id', adminController.editCategory);
router.get('/categories/delete/:id', adminController.deleteCategory);

// Ana Sayfa Yönetim Rotaları
router.get('/home-settings', adminController.getHomeSettings);
router.post('/home-settings/update', adminController.updateHomeSettings);
router.post('/home-sections/add', adminController.addHomeSection);
router.post('/home-sections/edit/:id', adminController.editHomeSection);
router.get('/home-sections/delete/:id', adminController.deleteHomeSection);

// Support Routes
router.get('/support', adminController.getSupport);
router.get('/support/messages/:userId', adminController.getUserMessages);
router.post('/support/send', adminController.sendAdminMessage);
router.put('/support/message/:id', adminController.editChatMessage);
router.delete('/support/message/:id', adminController.deleteChatMessage);
router.post('/support/end-chat/:userId', adminController.endChat);

module.exports = router;
