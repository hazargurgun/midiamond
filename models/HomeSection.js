const mongoose = require('mongoose');

const homeSectionSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true,
        trim: true
    },
    order: { 
        type: Number, 
        default: 0 
    },
    products: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product' 
    }]
}, { timestamps: true });

module.exports = mongoose.model('HomeSection', homeSectionSchema);
