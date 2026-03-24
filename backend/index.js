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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB 连接
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB 连接成功'))
.catch(err => console.error('❌ MongoDB 连接失败:', err.message));

// 路由
app.use('/api/users', require('./routes/users'));
app.use('/api/knowledge-points', require('./routes/knowledgePoints'));
app.use('/api/memories', require('./routes/memories'));
app.use('/api/trainings', require('./routes/trainings'));
app.use('/api/emotions', require('./routes/emotions'));
app.use('/api/recordings', require('./routes/recordings'));

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

// 🔥 固定端口写法，Railway 专用
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('🚀 Server running on port ' + PORT);
});