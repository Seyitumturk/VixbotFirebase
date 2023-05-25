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
  history: [{
    role: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    }
  }]
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
