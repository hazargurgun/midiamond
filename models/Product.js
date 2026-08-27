const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    categories: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category'
        }],
        default: []
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 1
    },
    imageUrl: {
        type: String,
        default: '/assets/img/gallery/popular1.png'
    },
    images: [{
        url: String,
        order: Number
    }],
    videoUrl: {
        type: String,
        default: ''
    },
    videoOrder: {
        type: Number,
        default: 99
    },
    isPopular: {
        type: Boolean,
        default: false
    },
    // --- Mücevher Özellikleri (İsteğe Bağlı) ---
    productCode: {
        type: String,
        trim: true,
        default: ''
    },
    metal: {
        type: String,
        trim: true,
        default: ''
    },
    metalColor: {
        type: String,
        trim: true,
        default: ''
    },
    gemType: {
        type: String,
        trim: true,
        default: ''
    },
    caratWeight: {
        type: Number,
        default: null
    },
    caratRange: {
        type: String,
        default: ''
    },
    // --- Çoklu Karat Seçenekleri ---
    // Her seçenek: { carat: 1.08, price: 29990 }
    caratOptions: {
        type: [{
            carat: { type: Number, required: true },
            price: { type: Number, required: true }
        }],
        default: []
    },
    gemColor: {
        type: String,
        trim: true,
        default: ''
    },
    gemClarity: {
        type: String,
        trim: true,
        default: ''
    },
    gemCut: {
        type: String,
        trim: true,
        default: ''
    },
    certificate: {
        type: String,
        trim: true,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', productSchema);
