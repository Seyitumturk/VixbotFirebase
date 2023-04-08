const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  context: {
    type: String,
    required: true,
  },
  history: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      message: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
