const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TemplateSchema = new Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  template_name: {
    type: String,
    required: true,
  },
  template_details: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Template', TemplateSchema);
