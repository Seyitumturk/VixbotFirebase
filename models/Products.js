const mongoose = require('mongoose');

const productsSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    },
    product_name: {
        type: String,
        trim: true
    },
    main_features: {
        type: String,
        trim: true

    },
    unique_selling_points: {
        type: String,
        trim: true
    },

    pricing_model: {
        type: String,
        trim: true
    },
    distribution_channels: {
        type: String,
        trim: true
    },
    summary: { 
        type: String,
        trim: true
    },

    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

const Products = mongoose.model('Products', productsSchema);

module.exports = Products;
