const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 静态资源
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==============================================
// 🔥 关键修复 1：MongoDB 安全连接（不会崩溃）
// ==============================================
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 3000
})
.then(() => console.log('✅ MongoDB 连接成功'))
.catch(err => console.error('❌ MongoDB 连接失败:', err.message));

// ==============================================
// 🔥 关键修复 2：路由路径全部改成 ../
// ==============================================
app.use('/api/users', require('../routes/users'));
app.use('/api/knowledge-points', require('../routes/knowledgePoints'));
app.use('/api/memories', require('../routes/memories'));
app.use('/api/trainings', require('../routes/trainings'));
app.use('/api/emotions', require('../routes/emotions'));
app.use('/api/recordings', require('../routes/recordings'));

// 测试接口
app.get('/', (req, res) => {
  res.send('✅ 后端运行正常！');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// ==============================================
// 🔥 关键修复 3：绝对不监听端口，只导出
// ==============================================
module.exports = app;