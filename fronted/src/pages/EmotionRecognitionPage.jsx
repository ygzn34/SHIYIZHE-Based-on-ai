import { useState } from 'react';
import { useEmotion } from '../contexts/EmotionContext';

function EmotionRecognitionPage() {
  const { 
    isCameraOpen, 
    currentEmotion, 
    loading, 
    history, 
    recordings,
    openCamera, 
    closeCamera, 
    analyzeEmotion, 
    handleDeleteOne, 
    handleDeleteAll,
    handleDeleteRecording,
    isModelsLoaded,
    modelLoadError,
    loadModels
  } = useEmotion();

  const [activeTab, setActiveTab] = useState('recognition'); // 'recognition' | 'recordings'

  // 下载录制文件
  const downloadRecording = (url, fileName) => {
    const link = document.createElement('a');
    link.href = `http://localhost:3000${url}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">情绪识别</h1>
            <p className="text-slate-600">通过 AI 实时分析您的面部情绪状态</p>
            {!isModelsLoaded && !modelLoadError && (
              <p className="text-amber-500 text-sm font-bold animate-pulse">
                ⚠️ 正在从云端加载 AI 识别模型，请稍候...
              </p>
            )}
            {modelLoadError && (
              <div className="flex items-center space-x-2 mt-2">
                <p className="text-red-500 text-sm font-bold">
                  ❌ {modelLoadError}
                </p>
                <button 
                  onClick={loadModels}
                  className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-full hover:bg-red-200 transition-colors"
                >
                  点击重试
                </button>
              </div>
            )}
          </div>
          
          {/* 标签页切换 */}
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button
              onClick={() => setActiveTab('recognition')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'recognition' 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              情绪分析
            </button>
            <button
              onClick={() => setActiveTab('recordings')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'recordings' 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              录制历史
            </button>
          </div>
        </header>

        {activeTab === 'recognition' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {/* 控制面板 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 mb-4">功能控制</h2>
                <div className="space-y-4">
                  {!isCameraOpen ? (
                    <button
                      onClick={openCamera}
                      className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-1"
                    >
                      开启情绪识别
                    </button>
                  ) : (
                    <>
                      <button
                      onClick={() => analyzeEmotion()}
                      disabled={loading || !isModelsLoaded}
                      className={`w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 hover:shadow-green-500/40 transition-all transform hover:-translate-y-1 ${(loading || !isModelsLoaded) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {loading ? 'AI 分析中...' : !isModelsLoaded ? (modelLoadError ? '模型加载失败' : '模型加载中...') : '识别当前情绪'}
                    </button>
                      <button
                        onClick={closeCamera}
                        className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                      >
                        关闭摄像头
                      </button>
                    </>
                  )}
                </div>

                {currentEmotion && (
                  <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                    <p className="text-slate-500 text-sm mb-1">当前识别结果</p>
                    <h3 className="text-3xl font-bold text-blue-600 mb-2">{currentEmotion.emotion}</h3>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="px-3 py-1 bg-white rounded-full text-xs font-bold text-blue-500 shadow-sm">
                        置信度: {currentEmotion.score}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 情绪识别历史 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100 h-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center">
                    <span className="mr-2">📊</span> 识别历史记录
                  </h2>
                  {history.length > 0 && (
                    <button
                      onClick={handleDeleteAll}
                      className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-all flex items-center"
                    >
                      <span className="mr-1">🗑️</span> 一键清空
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-[600px] pr-2 space-y-4">
                  {history.length > 0 ? (
                    history.map((item) => (
                      <div key={item._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-md transition-all group/item">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-inner ${
                            item.emotion === '开心' ? 'bg-yellow-100' : 
                            item.emotion === '平静' ? 'bg-blue-100' : 'bg-slate-200'
                          }`}>
                            {item.emotion === '开心' ? '😊' : 
                             item.emotion === '平静' ? '😐' : 
                             item.emotion === '惊讶' ? '😮' : 
                             item.emotion === '难过' ? '😢' : '😠'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{item.emotion}</p>
                            <p className="text-xs text-slate-400">
                              {new Date(item.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <span className="text-sm font-mono font-bold text-slate-600">
                              {item.score}%
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteOne(item._id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover/item:opacity-100"
                            title="删除此记录"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 text-slate-400">
                      <p className="text-5xl mb-4">📭</p>
                      <p>暂无识别历史记录</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 录制历史页面 */
          <div className="animate-in fade-in duration-500">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100 min-h-[500px]">
              <h2 className="text-2xl font-bold text-slate-800 mb-8 flex items-center">
                <span className="mr-2">🎥</span> 摄像头录制历史
              </h2>
              
              {recordings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recordings.map((recording) => (
                    <div key={recording._id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden group hover:shadow-lg transition-all">
                      {/* 视频预览区 */}
                      <div className="aspect-video bg-black relative">
                        <video 
                          src={`http://localhost:3000${recording.filePath}`}
                          className="w-full h-full object-contain"
                          controls
                        />
                      </div>
                      
                      {/* 信息区 */}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-bold text-slate-800 truncate w-40" title={recording.fileName}>
                              {recording.fileName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(recording.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-[10px] font-bold">
                            {recording.duration.toFixed(1)}s
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => downloadRecording(recording.filePath, recording.fileName)}
                              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-all"
                            >
                              <span>📥</span>
                              <span>下载导出</span>
                            </button>
                          </div>
                          <button
                            onClick={() => handleDeleteRecording(recording._id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition-all"
                            title="删除录制"
                          >
                            <span className="text-lg">🗑️</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-32 text-slate-400">
                  <p className="text-6xl mb-6">📹</p>
                  <h3 className="text-xl font-bold mb-2">暂无录制历史</h3>
                  <p className="text-sm">开启情绪识别时选择录制，记录将显示在这里</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmotionRecognitionPage;
