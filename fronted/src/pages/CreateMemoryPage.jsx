// src/pages/CreateMemoryPage.jsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';

function CreateMemoryPage() {
  const navigate = useNavigate();
  
  // 表单状态
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // 录音相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // 情绪标签相关状态
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTagColor, setCustomTagColor] = useState('#6c757d');
  
  // 录音相关引用
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);
  
  // 基本情绪标签（带颜色）
  const basicEmotionTags = [
    { name: '开心', color: '#ffc107' },
    { name: '兴奋', color: '#ff9800' },
    { name: '平静', color: '#4caf50' },
    { name: '感动', color: '#e91e63' },
    { name: '怀念', color: '#9c27b0' },
    { name: '温暖', color: '#f44336' },
    { name: '满足', color: '#00bcd4' },
    { name: '期待', color: '#2196f3' },
    { name: '放松', color: '#8bc34a' },
    { name: '感恩', color: '#ff5722' },
    { name: '悲伤', color: '#607d8b' },
    { name: '焦虑', color: '#795548' },
  ];
  
  // 预设颜色选项
  const presetColors = [
    '#ffc107', '#ff9800', '#4caf50', '#e91e63', '#9c27b0',
    '#f44336', '#00bcd4', '#2196f3', '#8bc34a', '#ff5722',
    '#607d8b', '#795548', '#6c757d', '#17a2b8', '#fd7e14'
  ];
  
  // 切换标签选中状态
  const toggleTag = (tagName, tagColor) => {
    setSelectedTags(prev => {
      const exists = prev.find(tag => tag.name === tagName);
      if (exists) {
        // 取消选中
        return prev.filter(tag => tag.name !== tagName);
      } else {
        // 选中
        return [...prev, { name: tagName, color: tagColor }];
      }
    });
  };
  
  // 添加自定义标签
  const handleAddCustomTag = () => {
    const trimmedInput = customTagInput.trim();
    if (trimmedInput && !selectedTags.find(tag => tag.name === trimmedInput)) {
      setSelectedTags(prev => [...prev, { name: trimmedInput, color: customTagColor }]);
      setCustomTagInput('');
    }
  };
  
  // 移除标签
  const removeTag = (tagName) => {
    setSelectedTags(prev => prev.filter(tag => tag.name !== tagName));
  };
  
  // 图片上传处理
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // 创建预览
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // 移除图片
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };
  
  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('无法访问麦克风，请检查浏览器权限设置');
    }
  };
  
  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // 删除录音
  const handleRemoveAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscription('');
  };
  
  // 音频转录
  const handleTranscribe = async () => {
    if (!audioBlob) {
      alert('请先录制音频');
      return;
    }
    
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      
      const response = await apiClient.post('/memories/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setTranscription(response.data.result);
    } catch (error) {
      console.error('Transcription error:', error);
      if (error.response?.status === 503) {
        alert('Whisper服务未运行，请确保Python Whisper服务已启动在 http://localhost:5001');
      } else {
        alert('转录失败：' + (error.response?.data?.msg || error.message));
      }
    } finally {
      setIsTranscribing(false);
    }
  };
  
  // 保存记忆
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() && !text.trim() && !imageFile && !audioBlob) {
      alert('请至少填写标题、文字、上传图片或录制音频中的一项');
      return;
    }
    
    setIsSaving(true);
    try {
      let finalTranscription = transcription;
      
      // 如果有录音但没有转录，自动进行转录
      if (audioBlob && !transcription) {
        try {
          setIsTranscribing(true);
          const transcribeFormData = new FormData();
          transcribeFormData.append('audio', audioBlob, 'recording.wav');
          
          const transcribeResponse = await apiClient.post('/memories/transcribe', transcribeFormData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          finalTranscription = transcribeResponse.data.result;
          setTranscription(finalTranscription);
        } catch (transcribeError) {
          console.warn('Auto transcription failed:', transcribeError);
          // 转录失败不影响保存，只是没有转录文本
          if (transcribeError.response?.status === 503) {
            console.warn('Whisper服务未运行，跳过自动转录');
          }
        } finally {
          setIsTranscribing(false);
        }
      }
      
      const formData = new FormData();
      formData.append('title', title || '未命名记忆');
      formData.append('text', text);
      formData.append('transcription', finalTranscription || '');
      formData.append('tags', JSON.stringify(selectedTags));
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      if (audioBlob) {
        formData.append('audio', audioBlob, 'recording.wav');
      }
      
      await apiClient.post('/memories', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // 保存成功，跳转到主页并传递刷新标志
      navigate('/', { state: { refresh: true } });
    } catch (error) {
      console.error('Save error:', error);
      alert('保存失败：' + (error.response?.data?.msg || error.message));
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 标题区域 */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
            创建记忆
          </h1>
          <p className="text-gray-600 text-lg">记录生活中的美好瞬间</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 标题输入 */}
          <div className="backdrop-blur-xl bg-white/70 rounded-2xl p-6 shadow-xl border border-white/20">
            <label htmlFor="title" className="block mb-3 text-lg font-semibold text-gray-700">
              标题
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入记忆标题..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-400"
            />
          </div>
          
          {/* 文字输入 */}
          <div className="backdrop-blur-xl bg-white/70 rounded-2xl p-6 shadow-xl border border-white/20">
            <label htmlFor="text" className="block mb-3 text-lg font-semibold text-gray-700">
              文字内容
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="输入记忆的文字内容..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-400 resize-y font-sans"
            />
          </div>
        
          {/* 图片上传 */}
          <div className="backdrop-blur-xl bg-white/70 rounded-2xl p-6 shadow-xl border border-white/20">
            <label className="block mb-3 text-lg font-semibold text-gray-700">
              图片
            </label>
            {!imagePreview ? (
              <div>
                <label htmlFor="image" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-white/50 hover:bg-white/70 transition-all duration-300 hover:border-purple-400">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">点击或拖拽上传图片</p>
                    <p className="text-xs text-gray-500">支持格式：JPEG, PNG, GIF, WebP</p>
                  </div>
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <img
                  src={imagePreview}
                  alt="预览"
                  className="w-full max-h-80 object-contain rounded-xl shadow-lg border-2 border-white/50"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                >
                  移除图片
                </button>
              </div>
            )}
          </div>
        
          {/* 录音功能 */}
          <div className="backdrop-blur-xl bg-white/70 rounded-2xl p-6 shadow-xl border border-white/20">
            <label className="block mb-3 text-lg font-semibold text-gray-700">
              录音
            </label>
            
            <div className="mb-4">
              {!isRecording && !audioUrl ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-lg"
                >
                  🎤 开始录音
                </button>
              ) : isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-lg animate-pulse"
                >
                  ⏹️ 停止录音
                </button>
              ) : (
                <div className="space-y-3">
                  <audio
                    ref={audioPlayerRef}
                    src={audioUrl}
                    controls
                    className="w-full rounded-xl"
                  />
                  <div className="flex gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleTranscribe}
                      disabled={isTranscribing}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isTranscribing ? '转录中...' : '🎯 转为文字'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveAudio}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                    >
                      删除录音
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* 转录结果显示 */}
            {transcription && (
              <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200/50 backdrop-blur-sm">
                <strong className="text-blue-700">转录结果：</strong>
                <p className="mt-2 text-gray-700 whitespace-pre-wrap leading-relaxed">{transcription}</p>
              </div>
            )}
          </div>
        
          {/* 情绪标签选择 */}
          <div className="backdrop-blur-xl bg-white/70 rounded-2xl p-6 shadow-xl border border-white/20">
            <label className="block mb-4 text-lg font-semibold text-gray-700">
              情绪标签
            </label>
            
            {/* 基本情绪标签 */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3 font-medium">
                选择情绪标签：
              </p>
              <div className="flex flex-wrap gap-2">
                {basicEmotionTags.map(tag => {
                  const isSelected = selectedTags.find(t => t.name === tag.name);
                  return (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => toggleTag(tag.name, tag.color)}
                      className={`px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300 transform hover:scale-110 ${
                        isSelected 
                          ? 'text-white shadow-lg scale-110' 
                          : 'bg-white/60 text-gray-700 hover:bg-white/80 border-2 border-gray-200'
                      }`}
                      style={{
                        backgroundColor: isSelected ? tag.color : undefined,
                        borderColor: isSelected ? tag.color : undefined,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* 自定义标签输入 */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3 font-medium">
                添加自定义标签：
              </p>
              <div className="flex gap-3 items-center flex-wrap">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                  placeholder="输入自定义标签..."
                  className="flex-1 min-w-[150px] px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-400"
                />
                <div className="flex gap-2 items-center">
                  <label className="text-sm text-gray-600 font-medium">颜色：</label>
                  <div className="flex gap-2">
                    {presetColors.slice(0, 8).map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCustomTagColor(color)}
                        className={`w-6 h-6 rounded-full transition-transform duration-200 hover:scale-125 border-2 ${
                          customTagColor === color ? 'border-gray-800 scale-125' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  disabled={!customTagInput.trim()}
                  className={`px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all duration-300 ${
                    customTagInput.trim()
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  添加
                </button>
              </div>
            </div>
            
            {/* 已选中的标签显示 */}
            {selectedTags.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-3 font-medium">
                  已选标签：
                </p>
                <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-br from-purple-50/50 to-blue-50/50 rounded-xl border-2 border-purple-200/30 backdrop-blur-sm">
                  {selectedTags.map(tag => (
                    <span
                      key={tag.name}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-white rounded-full text-sm font-bold shadow-md"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => removeTag(tag.name)}
                        className="w-4 h-4 rounded-full bg-white/30 hover:bg-white/50 transition-all duration-200 flex items-center justify-center text-xs leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* 提交按钮 */}
          <div className="flex gap-4 mt-8">
            <button
              type="submit"
              disabled={isSaving || isTranscribing}
              className={`flex-1 px-8 py-4 rounded-xl text-white font-bold text-lg transition-all duration-300 shadow-xl ${
                isSaving || isTranscribing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 hover:from-purple-700 hover:via-blue-700 hover:to-pink-700 transform hover:scale-105'
              }`}
            >
              {isTranscribing ? '转录中...' : isSaving ? '保存中...' : '✨ 保存记忆'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold text-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-xl transform hover:scale-105"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateMemoryPage;

