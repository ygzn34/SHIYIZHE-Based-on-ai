// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // 引入AuthProvider
import { EmotionProvider } from './contexts/EmotionContext'; // 引入EmotionProvider

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider> {/* 用AuthProvider包裹App，提供认证上下文 */}
        <EmotionProvider> {/* 用EmotionProvider包裹，提供全局情绪识别上下文 */}
          <App />
        </EmotionProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
