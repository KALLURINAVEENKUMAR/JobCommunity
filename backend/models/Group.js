const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  members: [{
    type: String,
    required: true
  }],
  creator: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['private', 'public'],
    default: 'private'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
groupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
