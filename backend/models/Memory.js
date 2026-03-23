// models/Memory.js
const mongoose = require('mongoose');

const MemorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: '未命名记忆'
  },
  text: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
  },
  audioUrl: {
    type: String,
    default: ''
  },
  transcription: {
    type: String,
    default: ''
  },
  tags: {
    type: [{
      name: {
        type: String,
        required: true
      },
      color: {
        type: String,
        required: true
      }
    }],
    default: []
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

// 更新时自动更新 updatedAt
MemorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Memory', MemorySchema);

