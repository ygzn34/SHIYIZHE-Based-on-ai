// index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // 1. 引入cors
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000; // 优先使用环境变量中的端口

// --- 核心中间件 ---
// 2. 使用cors中间件 - 解决跨域问题
// 讲解：CORS (Cross-Origin Resource Sharing) 是一个必需的步骤。当我们的前端（比如运行在localhost:5173）
// 尝试请求后端（运行在localhost:3000）时，浏览器会出于安全策略阻止它。 
// `cors()` 中间件会自动添加必要的响应头，告诉浏览器“我允许那个地址的请求”，从而让前后端可以顺利通信。
app.use(cors());

// 3. 使用express.json()中间件 - 解析请求体
// 讲解：这个中间件让我们的Express应用能够识别并处理传入的JSON格式数据（比如用户注册时POST的用户名和密码）。
app.use(express.json());

// 4. 静态文件服务 - 用于提供上传的图片和音频文件
// 添加中间件确保 SVG 文件使用正确的 Content-Type
app.use('/uploads', (req, res, next) => {
  if (req.path.endsWith('.svg')) {
    res.type('image/svg+xml');
  }
  next();
}, express.static(path.join(__dirname, 'uploads')));

// --- 数据库连接 ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- API 路由 ---
// GET / - 健康检查端点
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

// GET /api/health - 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 使用路由文件
app.use('/api/users', require('./routes/users'));
app.use('/api/knowledge-points', require('./routes/knowledgePoints')); // 知识点路由
app.use('/api/memories', require('./routes/memories')); // 记忆路由
app.use('/api/trainings', require('./routes/trainings')); // 康复训练路由
app.use('/api/emotions', require('./routes/emotions')); // 情绪识别路由
app.use('/api/recordings', require('./routes/recordings')); // 摄像头录制路由

// ... (app.listen)
// --- 404 处理 ---
// 处理所有未匹配的路由
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

// --- 启动服务器 ---
app.listen(port, () => {
  console.log(`CollectMemory backend is running at http://localhost:${port}`);
});