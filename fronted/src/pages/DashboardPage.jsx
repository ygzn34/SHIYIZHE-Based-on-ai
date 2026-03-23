// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/axios';

function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const fetchMemories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/memories');
      setMemories(response.data);
    } catch (err) {
      console.error('Error fetching memories:', err);
      setError('获取记忆失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  useEffect(() => {
    if (location.state?.refresh) {
      fetchMemories();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    if (filePath.startsWith('http')) return filePath;
    return `http://localhost:3000${filePath}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFilteredMemories = () => {
    return memories.filter(memory => {
      if (!memory.createdAt) return false;
      const date = new Date(memory.createdAt);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return year === selectedYear && month === selectedMonth && day === selectedDay;
    });
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear + 5; i >= currentYear - 10; i--) {
      years.push(i);
    }
    return years;
  };

  const getMonthOptions = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };

  const getDayOptions = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const filteredMemories = getFilteredMemories();

  const handleDelete = async (memoryId) => {
    if (!window.confirm('确定要删除这条记忆吗？此操作不可恢复。')) {
      return;
    }
    try {
      await apiClient.delete(`/memories/${memoryId}`);
      fetchMemories();
    } catch (err) {
      console.error('Error deleting memory:', err);
      alert('删除失败：' + (err.response?.data?.msg || err.message));
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center px-4 py-12"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl shadow-black/20 border border-white/20 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
            <span className="text-3xl">📝</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            拾忆者AI记忆重建平台
          </h1>
          <p className="text-gray-600 mb-6">重拾回忆，不止为了记住，更是为了感受</p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="min-h-screen px-4 py-12"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl shadow-black/20 border border-white/20 p-8 mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              拾忆者AI记忆重建平台
            </h1>
            <p className="text-gray-600 mb-6">重拾回忆，不止为了记住，更是为了感受</p>
          </div>
          <div className="backdrop-blur-xl bg-red-50/80 rounded-xl border border-red-200/50 p-4 mb-4 text-red-700">
            {error}
          </div>
          <button
            onClick={fetchMemories}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 hover:scale-105"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen px-4 py-8"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl shadow-black/20 border border-white/20 p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                拾忆者AI记忆重建平台
              </h1>
              <p className="text-gray-600 text-lg">重拾回忆，不止为了记住，更是为了感受</p>
            </div>
            <button
              onClick={() => navigate('/create-memory')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-200 hover:scale-105 whitespace-nowrap"
            >
              ➕ 创建新记忆
            </button>
          </div>
        </div>

        {/* 日期筛选器 */}
        {memories.length > 0 && (
          <div className="backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl shadow-black/10 border border-white/20 p-6 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <label className="font-bold text-gray-700">筛选：</label>
              <div className="flex items-center gap-2">
                <label className="text-gray-600 text-sm">年份：</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const newYear = parseInt(e.target.value);
                    setSelectedYear(newYear);
                    const daysInMonth = new Date(newYear, selectedMonth, 0).getDate();
                    if (selectedDay > daysInMonth) {
                      setSelectedDay(1);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 text-gray-900"
                >
                  {getYearOptions().map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-gray-600 text-sm">月份：</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const newMonth = parseInt(e.target.value);
                    setSelectedMonth(newMonth);
                    const daysInNewMonth = new Date(selectedYear, newMonth, 0).getDate();
                    if (selectedDay > daysInNewMonth) {
                      setSelectedDay(1);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 text-gray-900"
                >
                  {getMonthOptions().map(month => (
                    <option key={month} value={month}>{month}月</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-gray-600 text-sm">日期：</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                  className="px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 text-gray-900"
                >
                  {getDayOptions().map(day => (
                    <option key={day} value={day}>{day}日</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  const now = new Date();
                  setSelectedYear(now.getFullYear());
                  setSelectedMonth(now.getMonth() + 1);
                  setSelectedDay(now.getDate());
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 text-white font-medium shadow-lg shadow-gray-500/30 hover:shadow-xl hover:shadow-gray-500/40 transition-all duration-200 hover:scale-105 text-sm"
              >
                重置为今天
              </button>
            </div>
          </div>
        )}

        {/* 记忆列表 */}
        {memories.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl shadow-black/20 border border-white/20 p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-4xl">📝</span>
            </div>
            <p className="text-2xl text-gray-700 mb-6 font-semibold">还没有记忆</p>
            <button
              onClick={() => navigate('/create-memory')}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 hover:scale-105"
            >
              创建第一个记忆
            </button>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl shadow-black/20 border border-white/20 p-12 text-center">
            <p className="text-2xl text-gray-700 mb-6 font-semibold">
              {selectedYear}年{selectedMonth}月{selectedDay}日没有相关记忆
            </p>
            <button
              onClick={() => {
                const now = new Date();
                setSelectedYear(now.getFullYear());
                setSelectedMonth(now.getMonth() + 1);
                setSelectedDay(now.getDate());
              }}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 hover:scale-105"
            >
              查看今天
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredMemories.map((memory) => (
              <div
                key={memory._id}
                className="backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl shadow-black/10 border border-white/20 p-6 hover:shadow-2xl hover:shadow-black/20 transition-all duration-300 hover:scale-[1.01]"
              >
                {/* 标题 */}
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {memory.title || '未命名记忆'}
                </h2>

                {/* 日期 */}
                <p className="text-sm text-gray-500 mb-4">
                  {formatDate(memory.createdAt)}
                </p>

                {/* 情绪标签 */}
                {memory.tags && memory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {memory.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full text-sm font-semibold text-white shadow-lg"
                        style={{ backgroundColor: tag.color || '#6c757d' }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* 文字内容 */}
                {memory.text && (
                  <div className="mb-4">
                    <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {memory.text}
                    </p>
                  </div>
                )}

                {/* 图片 */}
                {memory.imageUrl && (
                  <div className="mb-4 rounded-xl overflow-hidden">
                    <img
                      src={getFileUrl(memory.imageUrl)}
                      alt={memory.title || '记忆图片'}
                      className="w-full max-h-96 object-contain rounded-xl"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* 录音 */}
                {memory.audioUrl && (
                  <div className="mb-4">
                    <div className="font-semibold text-gray-700 mb-2">🎤 录音：</div>
                    <audio
                      controls
                      src={getFileUrl(memory.audioUrl)}
                      className="w-full max-w-md"
                    >
                      您的浏览器不支持音频播放。
                    </audio>
                  </div>
                )}

                {/* 转录文本 */}
                {memory.transcription && (
                  <div className="mt-4 p-4 rounded-xl bg-blue-50/80 backdrop-blur-sm border-l-4 border-blue-500">
                    <div className="font-semibold text-gray-700 mb-2">📝 转录结果：</div>
                    <p className="whitespace-pre-wrap text-gray-600 leading-relaxed">
                      {memory.transcription}
                    </p>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="mt-6 pt-4 border-t border-gray-200/50 flex gap-3 justify-end">
                  <button
                    onClick={() => navigate(`/edit-memory/${memory._id}`)}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 hover:scale-105"
                  >
                    ✏️ 编辑
                  </button>
                  <button
                    onClick={() => handleDelete(memory._id)}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-200 hover:scale-105"
                  >
                    🗑️ 删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
