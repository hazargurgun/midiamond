const mongoose = require('mongoose');

const homeSettingSchema = new mongoose.Schema({
    newArrivalTitle: { 
        type: String, 
        default: 'Yeni Gelenler' 
    },
    service1Title: { type: String, default: 'Sigortalı Teslimat' },
    service1Desc:  { type: String, default: 'Güvenli ve hızlı kargo' },
    service2Title: { type: String, default: 'Güvenli Ödeme' },
    service2Desc:  { type: String, default: '256-bit SSL şifreleme' },
    service3Title: { type: String, default: 'Kolay İade' },
    service3Desc:  { type: String, default: '14 gün iade garantisi' },
    service4Title: { type: String, default: 'Uzman Destek' },
    service4Desc:  { type: String, default: '7/24 müşteri hizmetleri' },

    // Promo navigation bar (header bottom) — category-based
    promoNav1Label:    { type: String, default: 'Pırlanta Fırsatları Net %50 İndirim' },
    promoNav1Category: { type: String, default: '' },
    promoNav2Label:    { type: String, default: 'Çok Satanlar' },
    promoNav2Category: { type: String, default: '' },
    promoNav3Label:    { type: String, default: 'Hızlı Kargo' },
    promoNav3Category: { type: String, default: '' },
    promoNav4Label:    { type: String, default: 'Hediye Önerileri' },
    promoNav4Category: { type: String, default: '' },
    promoNav5Label:    { type: String, default: 'Online Özel' },
    promoNav5Category: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('HomeSetting', homeSettingSchema);


