// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 根据文件类型选择不同的目录
    if (file.fieldname === 'image') {
      const imageDir = path.join(uploadDir, 'images');
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }
      cb(null, imageDir);
    } else if (file.fieldname === 'audio') {
      const audioDir = path.join(uploadDir, 'audio');
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }
      cb(null, audioDir);
    } else if (file.fieldname === 'recording') {
      const recordingDir = path.join(uploadDir, 'recordings');
      if (!fs.existsSync(recordingDir)) {
        fs.mkdirSync(recordingDir, { recursive: true });
      }
      cb(null, recordingDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'image') {
    // 允许的图片格式
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件 (jpeg, jpg, png, gif, webp)'));
    }
  } else if (file.fieldname === 'audio') {
    // 允许的音频格式
    const allowedTypes = /wav|mp3|m4a|ogg|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传音频文件 (wav, mp3, m4a, ogg, webm)'));
    }
  } else if (file.fieldname === 'recording') {
    // 允许的录制格式
    const allowedTypes = /mp4|webm|ogg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传录制文件 (mp4, webm, ogg)'));
    }
  } else {
    cb(null, true);
  }
};

// 配置multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 限制
  },
  fileFilter: fileFilter
});

module.exports = upload;

