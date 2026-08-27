const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    guestName: {
        type: String,
        trim: true
    },
    guestEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    guestPhone: {
        type: String,
        trim: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        selectedCarat: {
            type: Number,
            default: null
        },
        selectedSize: {
            type: String,
            default: null
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed'],
        default: 'Pending'
    },
    orderStatus: {
        type: String,
        enum: ['Hazırlanıyor', 'Kargoya Verildi', 'Teslim Edildi', 'İptal Edildi'],
        default: 'Hazırlanıyor'
    },
    shippingAddress: {
        type: String,
        required: true
    },
    paytrToken: String,
    merchant_oid: String, // PayTR sipariş numarası
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', orderSchema);
