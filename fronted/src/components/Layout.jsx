// src/components/Layout.jsx
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Layout() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* 玻璃拟态导航栏 */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-white/20 shadow-lg shadow-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center space-x-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-xl group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
                <span className="text-2xl">📝</span>
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                拾忆者
              </span>
            </Link>
            
            {isAuthenticated ? (
              <>
                {/* 导航链接 */}
                <div className="hidden md:flex items-center space-x-1">
                  {[
                    { path: '/', label: '主页' },
                    { path: '/create-memory', label: '创建记忆' },
                    { path: '/keyword-cloud', label: '关键词云' },
                    { path: '/ai-summary', label: 'AI总结报告' },
                    { path: '/training', label: '康复训练' },
                    { path: '/ai-chat', label: 'AI对话' },
                    { path: '/emotion-recognition', label: '情绪识别' },
                  ].map(({ path, label }) => (
                    <Link
                      key={path}
                      to={path}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive(path)
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                          : 'text-gray-700 hover:bg-white/50 hover:text-blue-600'
                      }`}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
                
                {/* 退出按钮 */}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-white/50 hover:text-red-600 transition-all duration-200 backdrop-blur-sm bg-white/30 border border-white/20"
                >
                  退出登录
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive('/login')
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-700 hover:bg-white/50 hover:text-blue-600'
                  }`}
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive('/register')
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40'
                  }`}
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      <main className="relative">
        <Outlet />
      </main>
    </div>
  );
}
export default Layout;

