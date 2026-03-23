// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // 1. 从请求头中获取token
    // 支持两种方式：
    // - x-auth-token 请求头（传统方式）
    // - Authorization: Bearer <token>（标准方式，Postman使用）
    let token = req.header('x-auth-token');
    
    // 如果没有从 x-auth-token 获取到，尝试从 Authorization Bearer 获取
    if (!token) {
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // 移除 "Bearer " 前缀
        }
    }

    // 2. 检查token是否存在
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' }); // 401: 未授权
    }

    // 3. 验证token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 将解码后的用户信息（特别是user.id）附加到请求对象上
        req.user = decoded.user; 
        
        // 调用next()，将控制权交给下一个中间件或路由处理器
        next();

    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};