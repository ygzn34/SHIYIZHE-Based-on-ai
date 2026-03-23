// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

// 1. 创建Context
const AuthContext = createContext();

// 2. 自定义Hook，方便组件使用
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// 3. AuthProvider组件，提供认证状态和方法
export function AuthProvider({ children }) {
  // 1. 从localStorage初始化token
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null); // 可以在这里保存解码后的用户信息

  // 2. 使用useEffect同步localStorage
  // 当token变化时，更新localStorage
  useEffect(() => {
    if (token) {
      // 当token变化时，更新localStorage
      localStorage.setItem('token', token);
      // 可以在这里解码token获取用户信息，并设置user state
      // 暂时简化处理
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  // 登录：更新token（useEffect会自动同步到localStorage）
  const login = (newToken) => {
    setToken(newToken);
  };

  // 退出登录：清除token和user
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  // 判断是否已登录
  const isAuthenticated = !!token;

  // 3. 将 state 和函数通过 value prop 提供出去
  const value = { token, user, isAuthenticated, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

