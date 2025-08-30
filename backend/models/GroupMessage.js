const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    default: 'member'
  },
  timestamp: {
    type: Number,
    default: Date.now
  },
  mentions: [{
    userId: String,
    userName: String,
    userEmail: String
  }],
  replyTo: {
    messageId: String,
    text: String,
    userName: String,
    userId: String
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Number
  }
});

// Index for better query performance
groupMessageSchema.index({ groupId: 1, timestamp: 1 });
groupMessageSchema.index({ groupId: 1, userId: 1 });

const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);

module.exports = GroupMessage;
