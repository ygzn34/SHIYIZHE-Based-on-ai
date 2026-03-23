const mongoose = require('mongoose');

const emotionHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emotion: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  imageUrl: {
    type: String // 存储分析时的截图路径（可选）
  }
});

module.exports = mongoose.model('EmotionHistory', emotionHistorySchema);
