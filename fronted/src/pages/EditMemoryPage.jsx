// src/pages/EditMemoryPage.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/axios';

function EditMemoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // 表单状态
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  
  // 录音相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shouldDeleteImage, setShouldDeleteImage] = useState(false);
  const [shouldDeleteAudio, setShouldDeleteAudio] = useState(false);
  
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

  // 构建完整的文件 URL
  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    if (filePath.startsWith('http')) return filePath;
    return `http://localhost:3000${filePath}`;
  };

  // 加载记忆数据
  useEffect(() => {
    const fetchMemory = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/memories/${id}`);
        const memory = response.data;
        
        setTitle(memory.title || '');
        setText(memory.text || '');
        setTranscription(memory.transcription || '');
        setSelectedTags(memory.tags || []);
        
        if (memory.imageUrl) {
          setExistingImageUrl(memory.imageUrl);
          setImagePreview(getFileUrl(memory.imageUrl));
        }
        
        if (memory.audioUrl) {
          setExistingAudioUrl(memory.audioUrl);
          setAudioUrl(getFileUrl(memory.audioUrl));
        }
      } catch (err) {
        console.error('Error fetching memory:', err);
        alert('加载记忆失败：' + (err.response?.data?.msg || err.message));
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMemory();
    }
  }, [id, navigate]);
  
  // 图片上传处理
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setShouldDeleteImage(false); // 上传新图片时重置删除标志
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
    if (existingImageUrl) {
      setShouldDeleteImage(true);
    }
    setExistingImageUrl(null);
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
        setExistingAudioUrl(null); // 清除旧录音
        setShouldDeleteAudio(false); // 录制新音频时重置删除标志
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
    if (audioUrl && !existingAudioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    if (existingAudioUrl) {
      setShouldDeleteAudio(true);
    }
    setExistingAudioUrl(null);
    setTranscription('');
  };
  
  // 音频转录
  const handleTranscribe = async () => {
    if (!audioBlob && !existingAudioUrl) {
      alert('请先录制音频或使用现有音频');
      return;
    }
    
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      
      // 如果有新录音，使用新录音；否则使用现有录音
      if (audioBlob) {
        formData.append('audio', audioBlob, 'recording.wav');
      } else if (existingAudioUrl) {
        // 需要从服务器获取音频文件进行转录
        const audioResponse = await fetch(getFileUrl(existingAudioUrl));
        const audioBlobFromServer = await audioResponse.blob();
        formData.append('audio', audioBlobFromServer, 'audio.wav');
      }
      
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
    
    if (!title.trim() && !text.trim() && !imageFile && !existingImageUrl && !audioBlob && !existingAudioUrl) {
      alert('请至少填写标题、文字、上传图片或录制音频中的一项');
      return;
    }
    
    setIsSaving(true);
    try {
      let finalTranscription = transcription;
      
      // 如果有新录音但没有转录，自动进行转录
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
      
      // 处理删除图片标志
      if (shouldDeleteImage) {
        formData.append('deleteImage', 'true');
      }
      
      // 处理删除音频标志
      if (shouldDeleteAudio) {
        formData.append('deleteAudio', 'true');
      }
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      if (audioBlob) {
        formData.append('audio', audioBlob, 'recording.wav');
      }
      
      await apiClient.put(`/memories/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // 更新成功，跳转到主页并传递刷新标志
      navigate('/', { state: { refresh: true } });
    } catch (error) {
      console.error('Update error:', error);
      alert('更新失败：' + (error.response?.data?.msg || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        <h1>编辑记忆</h1>
        <p>加载中...</p>
      </div>
    );
  }
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>编辑记忆</h1>
      
      <form onSubmit={handleSubmit}>
        {/* 标题输入 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            标题
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入记忆标题..."
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>
        
        {/* 文字输入 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="text" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            文字内容
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入记忆的文字内容..."
            rows={6}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>
        
        {/* 图片上传 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            图片
          </label>
          {!imagePreview ? (
            <div>
              <input
                type="file"
                id="image"
                accept="image/*"
                onChange={handleImageChange}
                style={{ marginBottom: '0.5rem' }}
              />
              <p style={{ fontSize: '0.9rem', color: '#666' }}>
                支持格式：JPEG, PNG, GIF, WebP
              </p>
            </div>
          ) : (
            <div>
              <img
                src={imagePreview}
                alt="预览"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  borderRadius: '4px',
                  marginBottom: '0.5rem',
                }}
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                移除图片
              </button>
            </div>
          )}
        </div>
        
        {/* 录音功能 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            录音
          </label>
          
          <div style={{ marginBottom: '1rem' }}>
            {!isRecording && !audioUrl && !existingAudioUrl ? (
              <button
                type="button"
                onClick={startRecording}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  marginRight: '0.5rem',
                }}
              >
                🎤 开始录音
              </button>
            ) : isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  marginRight: '0.5rem',
                }}
              >
                ⏹️ 停止录音
              </button>
            ) : (
              <div>
                <audio
                  ref={audioPlayerRef}
                  src={audioUrl || getFileUrl(existingAudioUrl)}
                  controls
                  style={{ width: '100%', marginBottom: '0.5rem' }}
                />
                <div>
                  <button
                    type="button"
                    onClick={handleTranscribe}
                    disabled={isTranscribing}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isTranscribing ? 'not-allowed' : 'pointer',
                      marginRight: '0.5rem',
                      opacity: isTranscribing ? 0.6 : 1,
                    }}
                  >
                    {isTranscribing ? '转录中...' : '🎯 转为文字'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAudio}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    删除录音
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* 转录结果显示 */}
          {transcription && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              marginTop: '1rem',
            }}>
              <strong>转录结果：</strong>
              <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{transcription}</p>
            </div>
          )}
        </div>
        
        {/* 情绪标签选择 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            情绪标签
          </label>
          
          {/* 基本情绪标签 */}
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
              选择情绪标签：
            </p>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              {basicEmotionTags.map(tag => {
                const isSelected = selectedTags.find(t => t.name === tag.name);
                return (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => toggleTag(tag.name, tag.color)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: isSelected ? tag.color : '#f8f9fa',
                      color: isSelected ? '#fff' : '#333',
                      border: `2px solid ${isSelected ? tag.color : '#ddd'}`,
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      transition: 'all 0.3s ease',
                      transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: isSelected ? `0 4px 8px rgba(0,0,0,0.2)` : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor = tag.color;
                        e.target.style.color = '#fff';
                        e.target.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor = '#f8f9fa';
                        e.target.style.color = '#333';
                        e.target.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* 自定义标签输入 */}
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
              添加自定义标签：
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                style={{
                  padding: '0.5rem',
                  fontSize: '0.9rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  flex: '1',
                  minWidth: '150px',
                }}
              />
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.9rem', color: '#666' }}>颜色：</label>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {presetColors.slice(0, 8).map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCustomTagColor(color)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: customTagColor === color ? '2px solid #333' : '2px solid #ddd',
                        backgroundColor: color,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddCustomTag}
                disabled={!customTagInput.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: customTagInput.trim() ? '#007bff' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: customTagInput.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '0.9rem',
                }}
              >
                添加
              </button>
            </div>
          </div>
          
          {/* 已选中的标签显示 */}
          {selectedTags.length > 0 && (
            <div>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                已选标签：
              </p>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '0.5rem',
                padding: '0.75rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
              }}>
                {selectedTags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.8rem',
                      backgroundColor: tag.color || '#6c757d',
                      color: '#fff',
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => removeTag(tag.name)}
                      style={{
                        background: 'rgba(255,255,255,0.3)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        lineHeight: 1,
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.3)';
                      }}
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
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button
            type="submit"
            disabled={isSaving || isTranscribing}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (isSaving || isTranscribing) ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              opacity: (isSaving || isTranscribing) ? 0.6 : 1,
            }}
          >
            {isTranscribing ? '转录中...' : isSaving ? '保存中...' : '保存更改'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditMemoryPage;

