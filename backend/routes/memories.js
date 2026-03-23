// routes/memories.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const memoryController = require('../controllers/memoryController');

// 所有路由都需要认证
router.use(auth);

// 创建记忆（支持图片和音频上传）
router.post(
  '/',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
  ]),
  memoryController.createMemory
);

// 获取所有记忆
router.get('/', memoryController.getMemories);

// 获取单个记忆
router.get('/:id', memoryController.getMemory);

// 更新记忆（支持图片和音频上传）
router.put(
  '/:id',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
  ]),
  memoryController.updateMemory
);

// 删除记忆
router.delete('/:id', memoryController.deleteMemory);

// 音频转录接口（单独调用，不保存记忆）
router.post(
  '/transcribe',
  upload.single('audio'),
  memoryController.transcribeAudio
);

// 批量分析所有记忆的关键词和情感（必须在单个分析路由之前，避免误匹配）
router.post('/analyze/all', memoryController.analyzeAllMemories);

// 生成AI总结报告（必须在单个分析路由之前，避免误匹配）
router.post('/generate-summary', memoryController.generateSummary);

// 文本转语音（TTS）
router.post('/text-to-speech', memoryController.textToSpeech);

// AI 温情对话
router.post('/ai-chat', memoryController.aiChatWithMemories);

// 分析单个记忆的关键词和情感
router.post('/:id/analyze', memoryController.analyzeMemory);

module.exports = router;

