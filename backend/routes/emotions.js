const express = require('express');
const router = express.Router();
const EmotionHistory = require('../models/EmotionHistory');
const auth = require('../middleware/auth');

// @route   POST /api/emotions
// @desc    保存情绪识别记录
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { emotion, score, imageUrl } = req.body;
    
    const newRecord = new EmotionHistory({
      userId: req.user.id,
      emotion,
      score,
      imageUrl
    });

    const record = await newRecord.save();
    res.json(record);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET /api/emotions/history
// @desc    获取用户的情绪识别历史记录
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const history = await EmotionHistory.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(history);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE /api/emotions/history/all
// @desc    清空用户所有情绪识别历史记录
// @access  Private
router.delete('/history/all', auth, async (req, res) => {
  try {
    await EmotionHistory.deleteMany({ userId: req.user.id });
    res.json({ msg: '所有历史记录已清空' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE /api/emotions/:id
// @desc    删除单个情绪识别历史记录
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const record = await EmotionHistory.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ msg: '未找到该记录' });
    }

    // 检查用户所有权
    if (record.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: '用户未授权' });
    }

    await record.deleteOne();
    res.json({ msg: '记录已删除' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router;
