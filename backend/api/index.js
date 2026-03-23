// index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

// ========== 环境变量校验 ==========
if (!process.env.MONGO_URI) {
  console.error('❌ Error: MONGO_URI is not defined in .env file');
  process.exit(1);
}

// ========== 核心中间件 ==========
// 跨域配置（生产环境限定域名）
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// 解析 JSON 请求体
app.use(express.json());

// 静态文件服务（兼容 SVG）
app.use('/uploads', (req, res, next) => {
  if (req.path.endsWith('.svg')) {
    res.type('image/svg+xml');
  }
  next();
}, express.static(path.join(__dirname, 'uploads')));

// ========== 数据库连接 ==========
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully!'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// ========== API 路由 ==========
// 健康检查
app.get('/', (req, res) => {
  res.json({
    message: 'CollectMemory API is running',
    status: 'ok',
    endpoints: {
      health: 'GET /api/health',
      register: 'POST /api/users/register',
      login: 'POST /api/users/login',
      knowledgePoints: 'GET/POST/PUT/DELETE /api/knowledge-points',
      memories: 'GET/POST/PUT/DELETE /api/memories',
      transcribe: 'POST /api/memories/transcribe'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 业务路由
app.use('/api/users', require('./routes/users'));
app.use('/api/knowledge-points', require('./routes/knowledgePoints'));
app.use('/api/memories', require('./routes/memories'));
app.use('/api/trainings', require('./routes/trainings'));
app.use('/api/emotions', require('./routes/emotions'));
app.use('/api/recordings', require('./routes/recordings'));

// ========== 错误处理 ==========
// 404 处理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The endpoint ${req.method} ${req.path} does not exist`,
    availableEndpoints: {
      health: 'GET /api/health',
      register: 'POST /api/users/register',
      login: 'POST /api/users/login',
      knowledgePoints: 'GET/POST/PUT/DELETE /api/knowledge-points',
      memories: 'GET/POST/PUT/DELETE /api/memories',
      transcribe: 'POST /api/memories/transcribe'
    }
  });
});

// 全局 500 错误处理
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Server encountered an unexpected error',
    status: 500
  });
});

// ========== 启动服务 ==========
// 本地环境启动
if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 Local server running on http://localhost:${port}`);
    console.log(`🔍 Health check: http://localhost:${port}/api/health`);
  });
}

// 导出给 Vercel 使用
module.exports = app;