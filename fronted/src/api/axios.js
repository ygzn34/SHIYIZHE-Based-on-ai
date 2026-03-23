// src/api/axios.js
import axios from 'axios';

// 创建一个专用的axios实例，统一配置API的根路径
// 这样做的好处：
// 1. 统一配置API的根路径，以后后端地址变了只改这一个地方
// 2. 方便后续统一处理请求头，比如添加认证Token
const apiClient = axios.create({
    baseURL: 'http://localhost:3000/api', // 后端API的基础路径
    headers: {
        'Content-Type': 'application/json',
    },
});

// 请求拦截器：在每次请求前自动添加token
apiClient.interceptors.request.use(
    (config) => {
        // 从localStorage获取token
        const token = localStorage.getItem('token');
        if (token) {
            // 如果存在token，添加到请求头
            config.headers['x-auth-token'] = token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器：处理401未授权错误
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // token过期或无效，清除本地token并跳转到登录页
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;







