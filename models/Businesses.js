const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  },

  name: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  occupation: {
    type: String,
    trim: true
  },
  stands_for: {
    type: String,
    trim: true
  },
  communication_tone: {
    type: String,
    trim: true
  },
  main_competitors: {
    type: String,
    trim: true
  },
  strengths: {
    type: String,
    trim: true
  },
  weaknesses: {
    type: String,
    trim: true
  },
  typical_growth: {
    type: String,
    trim: true
  },
  teamsize_and_structure: {
    type: String,
    trim: true
  },
  company_culture: {
    type: String,
    trim: true
  },
  main_bussiness_goals: {
    type: String,
    trim: true
  },

  gpt_business_summary: {
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

const Business = mongoose.model('Business', businessSchema);

module.exports = Business;
