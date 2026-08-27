const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['hero', 'middle', 'footer_banner'],
        default: 'hero'
    },
    imageUrl: {
        type: String,
        required: true
    },
    mobileImageUrl: {
        type: String,
        default: ''
    },
    desktopHeight: {
        type: String,
        default: '980px'
    },
    mobileHeight: {
        type: String,
        default: '124vw'
    },
    title: String,
    subtitle: String,
    link: {
        type: String,
        default: '/shop'
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Banner', bannerSchema);
