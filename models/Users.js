const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    onboarding_completed: {
         type: Boolean,
         default: false
    },
    conversations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversations'
    }],
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now,
        set: function (v) {
            return this.isNew ? this.updated_at : new Date();
        },
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
