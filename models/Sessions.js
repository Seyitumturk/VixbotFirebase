const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  token: {
    type: String,
    required: true,
    trim: true,
    unique: true
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

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
