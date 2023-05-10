const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    },
    template_name: {
        type: String,
        trim: true
    },
    template_context: {
        type: String,
        trim: true
    },
    template_functionality: {
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

const Template = mongoose.model('Templates', templateSchema);

module.exports = Template;
