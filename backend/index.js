const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// =========================
// 中间件
// =========================
app.use(cors());
app.use(express.json());

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =========================
// 数据库连接（Vercel 安全版）
// =========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB 连接成功'))
  .catch(err => console.error('❌ MongoDB 连接失败:', err));

// =========================
// 测试路由
// =========================
app.get('/', (req, res) => {
  res.send('✅ 后端运行成功！');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// =========================
// 你的业务路由（保留不动）
// =========================
app.use('/api/users', require('./routes/users'));
app.use('/api/knowledge-points', require('./routes/knowledgePoints'));
app.use('/api/memories', require('./routes/memories'));
app.use('/api/trainings', require('./routes/trainings'));
app.use('/api/emotions', require('./routes/emotions'));
app.use('/api/recordings', require('./routes/recordings'));

// 404
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// =========================
// ❌ 禁止 app.listen！
// 只导出，不启动！
// =========================
module.exports = app;