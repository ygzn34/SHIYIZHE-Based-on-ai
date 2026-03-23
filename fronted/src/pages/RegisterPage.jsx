// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/axios';

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/users/register', {
        name: username,
        email,
        password,
      });
      
      console.log('注册成功:', response.data);
      login(response.data.token);
      navigate('/');
    } catch (err) {
      console.error('注册失败:', err.response?.data || err);
      setError(err.response?.data?.msg || '注册失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* 玻璃拟态卡片 */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl shadow-black/20 border border-white/20 p-8 space-y-6">
        {/* 头部 */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            创建账户
          </h1>
          <p className="text-gray-600 text-sm">注册新账户以开始使用</p>
        </div>
        
        {/* 错误提示 */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 text-sm">
            {error}
          </div>
        )}
        
        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              用户名
            </label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all duration-200 text-gray-900 placeholder-gray-400"
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入您的用户名"
              required
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              邮箱
            </label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all duration-200 text-gray-900 placeholder-gray-400"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入您的邮箱"
              required
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              密码
            </label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all duration-200 text-gray-900 placeholder-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入您的密码"
              required
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                注册中...
              </span>
            ) : '注册'}
          </button>
        </form>
        
        {/* 底部链接 */}
        <div className="text-center text-sm text-gray-600">
          已有账户？{' '}
          <Link 
            to="/login" 
            className="text-indigo-600 font-semibold hover:text-purple-600 transition-colors duration-200"
          >
            立即登录
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
