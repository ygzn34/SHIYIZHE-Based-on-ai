// src/pages/KeywordCloudPage.jsx
import { useState, useEffect, useMemo } from 'react';
import apiClient from '../api/axios';
import KeywordCloud3D from '../components/KeywordCloud3D';

function KeywordCloudPage() {
  const [memories, setMemories] = useState([]);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [keywordCloud, setKeywordCloud] = useState({});
  const [emotionStats, setEmotionStats] = useState({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  // 获取所有记忆
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

  // 组件加载时获取记忆
  useEffect(() => {
    fetchMemories();
  }, []);

  // 使用useMemo缓存筛选后的记忆
  const filteredMemories = useMemo(() => {
    return memories.filter(memory => {
      if (!memory.createdAt) return false;
      const date = new Date(memory.createdAt);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return year === selectedYear && month === selectedMonth && day === selectedDay;
    });
  }, [memories, selectedYear, selectedMonth, selectedDay]);

  // 当日期改变时，更新关键词云和情感统计（只显示筛选后的记忆）
  useEffect(() => {
    if (analysisResults.length > 0) {
      const filteredMemoryIds = new Set(filteredMemories.map(m => m._id));
      const filteredResults = analysisResults.filter(r => filteredMemoryIds.has(r.memoryId));
      generateKeywordCloud(filteredResults);
      generateEmotionStats(filteredResults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, selectedDay, filteredMemories]);


  // 生成年份选项（当前年份前后5年）
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear + 5; i >= currentYear - 10; i--) {
      years.push(i);
    }
    return years;
  };

  // 生成月份选项
  const getMonthOptions = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };

  // 生成日期选项（根据选中的年月）
  const getDayOptions = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // 分析所有记忆（只分析筛选后的记忆）
  const handleAnalyzeAll = async () => {
    if (filteredMemories.length === 0) {
      alert('所选日期没有记忆需要分析');
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      
      // 分析筛选后的记忆
      const analyzePromises = filteredMemories.map(memory => 
        apiClient.post(`/memories/${memory._id}/analyze`)
          .then(response => ({
            memoryId: memory._id,
            title: memory.title || '未命名记忆',
            createdAt: memory.createdAt,
            success: true,
            keywords: response.data.keywords || [],
            emotion: response.data.emotion || '未知',
            emotionDescription: response.data.emotionDescription || ''
          }))
          .catch(err => ({
            memoryId: memory._id,
            title: memory.title || '未命名记忆',
            createdAt: memory.createdAt,
            success: false,
            error: err.response?.data?.msg || err.message
          }))
      );
      
      const results = await Promise.all(analyzePromises);
      
      // 更新分析结果，保留其他记忆的分析结果
      setAnalysisResults(prevResults => {
        const updatedResults = [...prevResults];
        results.forEach(newResult => {
          const existingIndex = updatedResults.findIndex(r => r.memoryId === newResult.memoryId);
          if (existingIndex >= 0) {
            updatedResults[existingIndex] = newResult;
          } else {
            updatedResults.push(newResult);
          }
        });
        return updatedResults;
      });
      
      // 生成关键词云数据（只显示筛选后的记忆）
      generateKeywordCloud(results);
      
      // 生成情感统计（只显示筛选后的记忆）
      generateEmotionStats(results);
      
    } catch (err) {
      console.error('Error analyzing memories:', err);
      setError('分析失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setAnalyzing(false);
    }
  };

  // 分析单个记忆
  const handleAnalyzeSingle = async (memoryId) => {
    try {
      const response = await apiClient.post(`/memories/${memoryId}/analyze`);
      
      // 更新分析结果
      const updatedResults = [...analysisResults];
      const existingIndex = updatedResults.findIndex(r => r.memoryId === memoryId);
      
      const newResult = {
        memoryId: memoryId,
        title: memories.find(m => m._id === memoryId)?.title || '未命名记忆',
        createdAt: memories.find(m => m._id === memoryId)?.createdAt,
        success: true,
        keywords: response.data.keywords || [],
        emotion: response.data.emotion || '未知',
        emotionDescription: response.data.emotionDescription || ''
      };
      
      if (existingIndex >= 0) {
        updatedResults[existingIndex] = newResult;
      } else {
        updatedResults.push(newResult);
      }
      
      setAnalysisResults(updatedResults);
      
      // 重新生成关键词云和情感统计
      generateKeywordCloud([newResult]);
      generateEmotionStats(updatedResults);
      
    } catch (err) {
      console.error('Error analyzing memory:', err);
      alert('分析失败：' + (err.response?.data?.msg || err.message));
    }
  };

  // 生成关键词云数据
  const generateKeywordCloud = (results) => {
    const keywordCount = {};
    
    results.forEach(result => {
      if (result.success && result.keywords && Array.isArray(result.keywords)) {
        result.keywords.forEach(keyword => {
          keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
        });
      }
    });
    
    setKeywordCloud(keywordCount);
  };

  // 生成情感统计
  const generateEmotionStats = (results) => {
    const emotionCount = {};
    
    results.forEach(result => {
      if (result.success && result.emotion) {
        emotionCount[result.emotion] = (emotionCount[result.emotion] || 0) + 1;
      }
    });
    
    setEmotionStats(emotionCount);
  };

  // 获取关键词大小（根据出现频率）
  const getKeywordSize = (count) => {
    const maxCount = Math.max(...Object.values(keywordCloud), 1);
    const ratio = count / maxCount;
    if (ratio > 0.7) return '2rem';
    if (ratio > 0.4) return '1.5rem';
    if (ratio > 0.2) return '1.2rem';
    return '1rem';
  };

  // 获取关键词颜色（根据关键词生成不同颜色）
  const getKeywordColor = (keyword, index) => {
    // 使用彩虹色系，为每个关键词分配不同的颜色
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
      '#EC7063', '#5DADE2', '#58D68D', '#F39C12', '#8E44AD',
      '#E74C3C', '#3498DB', '#1ABC9C', '#F1C40F', '#9B59B6',
      '#E67E22', '#16A085', '#27AE60', '#D35400', '#C0392B'
    ];
    
    // 根据关键词的hash值或索引来选择颜色
    let hash = 0;
    for (let i = 0; i < keyword.length; i++) {
      hash = keyword.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  // 获取关键词背景颜色（浅色版本）
  const getKeywordBgColor = (keyword, index) => {
    const baseColor = getKeywordColor(keyword, index);
    // 将颜色转换为rgba，降低透明度作为背景色
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  };

  // 获取情感颜色
  const getEmotionColor = (emotion) => {
    const emotionColors = {
      '开心': '#28a745',
      '快乐': '#28a745',
      '兴奋': '#ffc107',
      '平静': '#17a2b8',
      '悲伤': '#6c757d',
      '焦虑': '#dc3545',
      '紧张': '#dc3545',
      '愤怒': '#dc3545',
      '失望': '#6c757d',
      '满足': '#28a745',
      '感激': '#28a745',
      '未知': '#6c757d'
    };
    
    for (const [key, color] of Object.entries(emotionColors)) {
      if (emotion && emotion.includes(key)) {
        return color;
      }
    }
    return '#6c757d';
  };

  // 格式化日期
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
            关键词云
          </h1>
          <p className="text-gray-600 text-lg">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 标题和按钮区域 */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
              关键词云
            </h1>
            <p className="text-gray-600 text-lg">探索记忆中的关键词和情感</p>
          </div>
          <button
            onClick={handleAnalyzeAll}
            disabled={analyzing || memories.length === 0}
            className={`px-6 py-3 rounded-xl text-white font-bold text-lg transition-all duration-300 shadow-xl transform hover:scale-105 ${
              analyzing || memories.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 hover:from-purple-700 hover:via-blue-700 hover:to-pink-700'
            }`}
          >
            {analyzing ? '分析中...' : '✨ 分析所有记忆'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-xl backdrop-blur-sm">
            {error}
          </div>
        )}

        {memories.length === 0 ? (
          <div className="text-center p-12 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20">
            <p className="text-xl text-gray-600">还没有记忆，请先创建记忆</p>
          </div>
        ) : (
          <>
            {/* 日期筛选器 */}
            <div className="mb-8 p-6 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20">
              <label className="block mb-4 font-bold text-lg text-gray-700">筛选日期：</label>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 font-medium">年份：</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(parseInt(e.target.value));
                      const maxDay = new Date(parseInt(e.target.value), selectedMonth, 0).getDate();
                      if (selectedDay > maxDay) {
                        setSelectedDay(maxDay);
                      }
                    }}
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-800 cursor-pointer"
                  >
                    {getYearOptions().map(year => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 font-medium">月份：</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(parseInt(e.target.value));
                      const maxDay = new Date(selectedYear, parseInt(e.target.value), 0).getDate();
                      if (selectedDay > maxDay) {
                        setSelectedDay(maxDay);
                      }
                    }}
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-800 cursor-pointer"
                  >
                    {getMonthOptions().map(month => (
                      <option key={month} value={month}>{month}月</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 font-medium">日期：</label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-800 cursor-pointer"
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
                  className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-sm"
                >
                  重置为今天
                </button>
                <div className="ml-auto text-gray-600 text-sm font-medium">
                  共 <span className="text-purple-600 font-bold">{filteredMemories.length}</span> 条记忆
                </div>
              </div>
            </div>

          {/* 关键词云展示 */}
          {Object.keys(keywordCloud).length > 0 && (
            <div className="mb-8 p-8 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20">
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">3D 关键词云</h2>
              <KeywordCloud3D keywords={keywordCloud} />
            </div>
          )}

            {/* 情感统计 */}
            {Object.keys(emotionStats).length > 0 && (
              <div className="mb-8 p-8 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20">
                <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">情感统计</h2>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(emotionStats)
                    .sort((a, b) => b[1] - a[1])
                    .map(([emotion, count]) => (
                      <div
                        key={emotion}
                        className="px-6 py-3 text-white rounded-xl font-bold text-lg shadow-lg transform hover:scale-110 transition-all duration-300"
                        style={{ backgroundColor: getEmotionColor(emotion) }}
                      >
                        {emotion}: {count} 次
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 记忆列表及分析结果 */}
            <div className="mt-8">
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">记忆分析结果</h2>
              {filteredMemories.length === 0 ? (
                <div className="text-center p-12 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20">
                  <p className="text-xl text-gray-600">
                    {selectedYear}年{selectedMonth}月{selectedDay}日没有相关记忆
                  </p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredMemories.map((memory) => {
                    const analysis = analysisResults.find(r => r.memoryId === memory._id);
                    return (
                      <div
                        key={memory._id}
                        className="backdrop-blur-xl bg-white/70 rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300"
                      >
                        <div className="flex justify-between items-start mb-4 gap-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2 text-gray-800">
                              {memory.title || '未命名记忆'}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {formatDate(memory.createdAt)}
                            </p>
                            {(memory.text || memory.transcription) && (
                              <p className="text-sm text-gray-600 mt-2 max-h-24 overflow-hidden text-ellipsis">
                                {memory.transcription || memory.text}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAnalyzeSingle(memory._id)}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-sm whitespace-nowrap"
                          >
                            {analysis ? '重新分析' : '分析'}
                          </button>
                        </div>

                        {analysis && analysis.success ? (
                          <div className="mt-4 p-4 bg-gradient-to-br from-blue-50/80 to-purple-50/80 rounded-xl border-l-4 border-blue-500 backdrop-blur-sm">
                            <div className="mb-4">
                              <div className="font-bold mb-2 text-gray-800">
                                情感: <span style={{ color: getEmotionColor(analysis.emotion) }} className="text-lg">
                                  {analysis.emotion}
                                </span>
                              </div>
                              {analysis.emotionDescription && (
                                <p className="text-sm text-gray-600">
                                  {analysis.emotionDescription}
                                </p>
                              )}
                            </div>
                            <div>
                              <div className="font-bold mb-2 text-gray-800">
                                关键词:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {analysis.keywords && analysis.keywords.map((keyword, index) => (
                                  <span
                                    key={index}
                                    className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-semibold border border-blue-200"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : analysis && !analysis.success ? (
                          <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-xl">
                            分析失败: {analysis.error || '未知错误'}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default KeywordCloudPage;

