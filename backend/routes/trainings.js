// routes/trainings.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const trainingController = require('../controllers/trainingController');

// 所有路由都需要认证
router.use(auth);

// 获取训练类型信息
router.get('/types', trainingController.getTrainingTypes);

// 生成训练题目
router.post('/generate', trainingController.generateTraining);

// 提交答案并评分
router.post('/submit', trainingController.submitAnswers);

module.exports = router;

