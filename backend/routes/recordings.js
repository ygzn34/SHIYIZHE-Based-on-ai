const express = require('express');
const router = express.Router();
const Recording = require('../models/Recording');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

// @route   POST /api/recordings/upload
// @desc    上传录制的视频文件
// @access  Private
router.post('/upload', auth, upload.single('recording'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: '请选择要上传的文件' });
    }

    const { duration } = req.body;

    const newRecording = new Recording({
      userId: req.user.id,
      fileName: req.file.originalname,
      filePath: `/uploads/recordings/${req.file.filename}`,
      fileSize: req.file.size,
      duration: duration ? parseFloat(duration) : 0
    });

    const recording = await newRecording.save();
    res.json(recording);
  } catch (err) {
    console.error('上传录音失败:', err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET /api/recordings
// @desc    获取用户的所有录制记录
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const recordings = await Recording.find({ userId: req.user.id }).sort({ timestamp: -1 });
    res.json(recordings);
  } catch (err) {
    console.error('获取录制列表失败:', err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE /api/recordings/:id
// @desc    删除录制记录及文件
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);

    if (!recording) {
      return res.status(404).json({ msg: '未找到录制记录' });
    }

    // 检查用户所有权
    if (recording.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: '用户未授权' });
    }

    // 删除本地文件
    const absolutePath = path.join(__dirname, '..', recording.filePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await recording.deleteOne();
    res.json({ msg: '录制记录已删除' });
  } catch (err) {
    console.error('删除录制失败:', err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router;
