// src/pages/AISummaryPage.jsx
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';

function AISummaryPage() {
  const now = new Date();
  const [summaryType, setSummaryType] = useState('day'); // 'day', 'month', 'year'
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [memories, setMemories] = useState([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSynthesis, setSpeechSynthesis] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);

  // 获取记忆数据
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
    // 初始化语音合成
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      setSpeechSynthesis(synth);
      
      // 确保语音列表已加载（某些浏览器需要触发一次getVoices才能加载）
      if (synth.getVoices().length === 0) {
        synth.addEventListener('voiceschanged', () => {
          setSpeechSynthesis(synth);
        });
      }
    }
  }, []);

  // 清理语音合成和音频
  useEffect(() => {
    return () => {
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [speechSynthesis, currentAudio]);

  // 根据时间范围筛选记忆
  const getFilteredMemories = () => {
    if (!memories || memories.length === 0) return [];
    
    let startDate, endDate;
    
    switch (summaryType) {
      case 'day':
        // 日度总结：选择的具体日期
        startDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
        endDate = new Date(selectedYear, selectedMonth - 1, selectedDay, 23, 59, 59);
        break;
      case 'month':
        // 月度总结：选择的年月
        startDate = new Date(selectedYear, selectedMonth - 1, 1);
        endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
        break;
      case 'year':
        // 年度总结：选择的年份
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
        break;
      default:
        return memories;
    }
    
    return memories.filter(memory => {
      if (!memory.createdAt) return false;
      const memoryDate = new Date(memory.createdAt);
      return memoryDate >= startDate && memoryDate <= endDate;
    });
  };
  
  // 获取年份列表（最近10年）
  const getYearOptions = () => {
    const currentYear = now.getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      years.push(i);
    }
    return years;
  };
  
  // 获取月份列表
  const getMonthOptions = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };
  
  // 获取日期列表（根据选择的年月）
  const getDayOptions = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // 生成总结报告
  const handleGenerateSummary = async () => {
    const filteredMemories = getFilteredMemories();
    
    if (filteredMemories.length === 0) {
      alert('所选时间范围内没有记忆数据，无法生成总结报告');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSummary('');

      // 构建请求参数
      const requestData = {
        summaryType, // 'day', 'month', 'year'
        year: selectedYear,
        month: summaryType === 'day' || summaryType === 'month' ? selectedMonth : undefined,
        day: summaryType === 'day' ? selectedDay : undefined
      };
      
      const response = await apiClient.post('/memories/generate-summary', requestData);
      
      if (response.data && response.data.summary) {
        setSummary(response.data.summary);
      } else {
        setError('生成总结报告失败：返回数据格式错误');
      }
    } catch (err) {
      console.error('Error generating summary:', err);
      setError('生成总结报告失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setGenerating(false);
    }
  };

  // 获取时间范围描述
  const getTimeRangeDescription = () => {
    switch (summaryType) {
      case 'day':
        return `${selectedYear}年${selectedMonth}月${selectedDay}日`;
      case 'month':
        return `${selectedYear}年${selectedMonth}月`;
      case 'year':
        return `${selectedYear}年`;
      default:
        return '';
    }
  };
  
  // 当月份或年份改变时，调整日期（避免日期超出月份范围）
  useEffect(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [selectedYear, selectedMonth]);

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

  // 朗读总结内容
  const handlePlaySummary = async () => {
    if (!summary) {
      alert('没有可朗读的内容');
      return;
    }

    if (isPlaying) {
      // 如果正在播放，则停止
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
      }
      setIsPlaying(false);
      return;
    }

    try {
      // 优先尝试使用DeepSeek API进行TTS
      try {
        const response = await apiClient.post('/memories/text-to-speech', {
          text: summary
        });
        
        if (response.data && response.data.audioUrl) {
          // 使用DeepSeek生成的音频
          const audio = new Audio(response.data.audioUrl);
          setCurrentAudio(audio);
          audio.onplay = () => setIsPlaying(true);
          audio.onended = () => {
            setIsPlaying(false);
            setCurrentAudio(null);
          };
          audio.onpause = () => {
            setIsPlaying(false);
          };
          audio.onerror = () => {
            setIsPlaying(false);
            setCurrentAudio(null);
            // 如果DeepSeek失败，回退到浏览器API
            fallbackToBrowserTTS();
          };
          audio.play().catch((err) => {
            console.error('音频播放失败:', err);
            setIsPlaying(false);
            setCurrentAudio(null);
            fallbackToBrowserTTS();
          });
          return;
        }
      } catch (deepseekError) {
        // 如果DeepSeek返回501或fallback标志，使用浏览器API
        if (deepseekError.response?.status === 501 || deepseekError.response?.data?.fallback) {
          console.log('DeepSeek TTS不可用，使用浏览器API');
          fallbackToBrowserTTS();
        } else {
          console.error('DeepSeek TTS错误:', deepseekError);
          // 其他错误也回退到浏览器API
          fallbackToBrowserTTS();
        }
        return;
      }
    } catch (err) {
      console.error('朗读失败:', err);
      // 发生错误时回退到浏览器API
      fallbackToBrowserTTS();
    }
  };

  // 回退到浏览器Web Speech API
  const fallbackToBrowserTTS = () => {
    if (!speechSynthesis) {
      alert('浏览器不支持语音合成功能');
      return;
    }

    // 停止之前的播放
    speechSynthesis.cancel();
    
    // 创建语音合成对象
    const utterance = new SpeechSynthesisUtterance(summary);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9; // 语速（0.1-10，默认1）
    utterance.pitch = 1; // 音调（0-2，默认1）
    utterance.volume = 1; // 音量（0-1，默认1）

    // 尝试使用中文语音
    const voices = speechSynthesis.getVoices();
    const chineseVoice = voices.find(voice => 
      voice.lang.includes('zh') || voice.lang.includes('CN')
    );
    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }

    // 播放事件
    utterance.onstart = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = (error) => {
      console.error('语音合成错误:', error);
      setIsPlaying(false);
      alert('朗读失败，请重试');
    };

    // 开始播放
    speechSynthesis.speak(utterance);
  };

  const filteredMemories = getFilteredMemories();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
            AI总结报告
          </h1>
          <p className="text-gray-600 text-lg">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 标题区域 */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
            AI总结报告
          </h1>
          <p className="text-gray-600 text-lg">让AI帮你总结和回顾记忆</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-xl backdrop-blur-sm">
            {error}
          </div>
        )}

        {/* 时间范围选择 */}
        <div className="mb-8 p-8 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">选择总结类型和时间范围</h2>
          
          {/* 总结类型选择 */}
          <div className="mb-6">
            <label className="block mb-4 font-bold text-lg text-gray-700">
              总结类型：
            </label>
            <div className="flex gap-6 items-center flex-wrap">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="summaryType"
                  value="day"
                  checked={summaryType === 'day'}
                  onChange={(e) => setSummaryType(e.target.value)}
                  className="mr-2 w-5 h-5 cursor-pointer accent-purple-600"
                />
                <span className="text-lg text-gray-700 group-hover:text-purple-600 transition-colors font-semibold">日度总结</span>
              </label>
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="summaryType"
                  value="month"
                  checked={summaryType === 'month'}
                  onChange={(e) => setSummaryType(e.target.value)}
                  className="mr-2 w-5 h-5 cursor-pointer accent-purple-600"
                />
                <span className="text-lg text-gray-700 group-hover:text-purple-600 transition-colors font-semibold">月度总结</span>
              </label>
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="summaryType"
                  value="year"
                  checked={summaryType === 'year'}
                  onChange={(e) => setSummaryType(e.target.value)}
                  className="mr-2 w-5 h-5 cursor-pointer accent-purple-600"
                />
                <span className="text-lg text-gray-700 group-hover:text-purple-600 transition-colors font-semibold">年度总结</span>
              </label>
            </div>
          </div>
        
          {/* 时间选择器 */}
          <div className="mb-6">
            <label className="block mb-4 font-bold text-lg text-gray-700">
              选择时间：
            </label>
            <div className="flex flex-wrap gap-4 items-center">
              {/* 年份选择 */}
              <div className="flex items-center gap-2">
                <label className="text-gray-600 font-medium">年份：</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-800 cursor-pointer min-w-[100px]"
                >
                  {getYearOptions().map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>
              
              {/* 月份选择（日度和月度总结显示） */}
              {(summaryType === 'day' || summaryType === 'month') && (
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 font-medium">月份：</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-800 cursor-pointer min-w-[100px]"
                  >
                    {getMonthOptions().map(month => (
                      <option key={month} value={month}>{month}月</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* 日期选择（仅日度总结显示） */}
              {summaryType === 'day' && (
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 font-medium">日期：</label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-800 cursor-pointer min-w-[100px]"
                  >
                    {getDayOptions().map(day => (
                      <option key={day} value={day}>{day}日</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="ml-auto text-gray-600 text-sm font-medium">
                已选择：<span className="text-purple-600 font-bold">{getTimeRangeDescription()}</span>，共 <span className="text-purple-600 font-bold">{filteredMemories.length}</span> 条记忆
              </div>
            </div>
          </div>
          <button
            onClick={handleGenerateSummary}
            disabled={generating || filteredMemories.length === 0}
            className={`w-full mt-4 px-8 py-4 rounded-xl text-white font-bold text-lg transition-all duration-300 shadow-xl transform hover:scale-105 ${
              generating || filteredMemories.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 hover:from-purple-700 hover:via-blue-700 hover:to-pink-700'
            }`}
          >
            {generating ? '正在生成中...' : '✨ 生成AI总结报告'}
          </button>
        </div>

        {/* 总结报告展示 */}
        {summary && (
          <div className="mb-8 p-8 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border-2 border-purple-300/50">
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-purple-200/50">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
                {summaryType === 'day' ? '日度' : summaryType === 'month' ? '月度' : '年度'}总结报告
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-gray-600 text-sm font-medium bg-purple-100 px-4 py-2 rounded-full">
                  {getTimeRangeDescription()}
                </span>
                {/* 播放按钮 */}
                <button
                  onClick={handlePlaySummary}
                  disabled={!speechSynthesis}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 backdrop-blur-md border shadow-lg hover:shadow-xl transform hover:scale-105 ${
                    isPlaying
                      ? 'bg-gradient-to-r from-red-500/80 to-pink-500/80 hover:from-red-500/90 hover:to-pink-500/90 text-white border-white/40'
                      : 'bg-gradient-to-r from-purple-500/80 via-blue-600/80 to-pink-500/80 hover:from-purple-500/90 hover:via-blue-600/90 hover:to-pink-500/90 text-white border-white/40'
                  } ${!speechSynthesis ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={speechSynthesis ? {
                    boxShadow: isPlaying 
                      ? '0 8px 25px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                      : '0 8px 25px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                  } : {}}
                >
                  {isPlaying ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      停止播放
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                      播放朗读
                    </span>
                  )}
                </button>
              </div>
            </div>
            <div className="text-lg leading-relaxed text-gray-700 whitespace-pre-wrap text-justify bg-gradient-to-br from-purple-50/50 to-blue-50/50 p-6 rounded-xl border border-purple-100/50">
              {summary}
            </div>
          </div>
        )}

        {/* 记忆列表预览 */}
        {filteredMemories.length > 0 && (
          <div className="mt-8 p-6 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">相关记忆预览</h3>
            <div className="grid gap-4 max-h-96 overflow-y-auto pr-2">
              {filteredMemories.slice(0, 10).map((memory) => (
                <div
                  key={memory._id}
                  className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <h4 className="font-bold text-gray-800">{memory.title || '未命名记忆'}</h4>
                    <span className="text-xs text-gray-600 whitespace-nowrap">{formatDate(memory.createdAt)}</span>
                  </div>
                  {(memory.text || memory.transcription) && (
                    <p className="text-sm text-gray-600 max-h-16 overflow-hidden text-ellipsis">
                      {memory.transcription || memory.text}
                    </p>
                  )}
                </div>
              ))}
              {filteredMemories.length > 10 && (
                <div className="text-center text-gray-600 text-sm py-2">
                  还有 {filteredMemories.length - 10} 条记忆...
                </div>
              )}
            </div>
          </div>
        )}

        {memories.length === 0 && (
          <div className="text-center p-12 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20">
            <p className="text-xl text-gray-600">还没有记忆，请先创建记忆</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AISummaryPage;

