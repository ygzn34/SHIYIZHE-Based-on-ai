// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CreateMemoryPage from './pages/CreateMemoryPage';
import EditMemoryPage from './pages/EditMemoryPage';
import KeywordCloudPage from './pages/KeywordCloudPage';
import AISummaryPage from './pages/AISummaryPage';
import TrainingPage from './pages/TrainingPage';
import AIChatPage from './pages/AIChatPage';
import EmotionRecognitionPage from './pages/EmotionRecognitionPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute'; // 引入ProtectedRoute
import FloatingEmotionWindow from './components/FloatingEmotionWindow'; // 引入全局悬浮窗

function App() {
  return (
    <>
      <FloatingEmotionWindow />
      <Routes>
        <Route element={<Layout />}>
          {/* 公共路由 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* 受保护的路由 */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/create-memory" element={<CreateMemoryPage />} />
            <Route path="/edit-memory/:id" element={<EditMemoryPage />} />
            <Route path="/keyword-cloud" element={<KeywordCloudPage />} />
            <Route path="/ai-summary" element={<AISummaryPage />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/ai-chat" element={<AIChatPage />} />
            <Route path="/emotion-recognition" element={<EmotionRecognitionPage />} />
            {/* 未来其他的受保护页面也可以放在这里 */}
          </Route>
        </Route>
      </Routes>
    </>
  );
}
export default App;
