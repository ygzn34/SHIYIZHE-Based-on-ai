import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import apiClient from '../api/axios';
import { useAuth } from './AuthContext';
import * as faceapi from 'face-api.js';

const EmotionContext = createContext();

export const useEmotion = () => {
  const context = useContext(EmotionContext);
  if (!context) {
    throw new Error('useEmotion must be used within an EmotionProvider');
  }
  return context;
};

export const EmotionProvider = ({ children }) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [history, setHistory] = useState([]);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [modelLoadError, setModelLoadError] = useState(null); // 新增：模型加载错误状态
  const videoElementRef = useRef(null); // 新增：保存视频元素的引用
  
  // 录制相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [shouldRecord, setShouldRecord] = useState(false); // 用户是否确认录制
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [recordings, setRecordings] = useState([]);
  const recordingStartTimeRef = useRef(null);

  // 窗口状态：位置和大小
  const [windowPos, setWindowPos] = useState({ x: 100, y: 100 });
  const [windowSize, setWindowSize] = useState({ width: 400, height: 300 });
  const { isAuthenticated } = useAuth();

  // 加载 face-api.js 模型
  const loadModels = useCallback(async () => {
    // 使用 jsdelivr CDN，这在很多地区通常更稳定
    const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/weights';
    
    try {
      setLoading(true);
      setModelLoadError(null);
      console.log('正在加载 AI 情绪识别模型，来源:', MODEL_URL);
      
      // 逐个加载模型以便于监控进度
      console.log('1/4 正在加载人脸检测模型...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      
      console.log('2/4 正在加载特征点识别模型...');
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      
      console.log('3/4 正在加载人脸识别模型...');
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      
      console.log('4/4 正在加载情绪识别模型...');
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

      setIsModelsLoaded(true);
      console.log('✅ 所有 AI 情绪识别模型加载成功！');
    } catch (err) {
      console.error('❌ AI 模型加载失败:', err);
      setModelLoadError('AI 模型加载失败，可能是网络原因。请检查网络并重试。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // 当用户退出登录时，自动关闭摄像头
  useEffect(() => {
    if (!isAuthenticated && isCameraOpen) {
      closeCamera();
    }
  }, [isAuthenticated, isCameraOpen]);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await apiClient.get('/emotions/history');
      setHistory(response.data);
    } catch (err) {
      console.error('获取历史记录失败:', err);
    }
  }, []);

  const fetchRecordings = useCallback(async () => {
    try {
      const response = await apiClient.get('/recordings');
      setRecordings(response.data);
    } catch (err) {
      console.error('获取录制列表失败:', err);
    }
  }, []);

  // 真正的 AI 情绪识别逻辑
  const analyzeEmotion = useCallback(async (providedVideoElement = null) => {
    const videoElement = providedVideoElement || videoElementRef.current;
    if (!isCameraOpen || !isModelsLoaded || !videoElement) return;
    
    setLoading(true);
    try {
      // 执行人脸检测和情绪识别
      const detections = await faceapi.detectSingleFace(
        videoElement, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceExpressions();

      if (detections) {
        // 找到概率最高的情绪
        const expressions = detections.expressions;
        const emotionMap = {
          happy: '开心',
          neutral: '平静',
          surprised: '惊讶',
          sad: '难过',
          angry: '愤怒',
          fearful: '恐惧',
          disgusted: '厌恶'
        };

        let maxEmotion = 'neutral';
        let maxProb = 0;

        Object.entries(expressions).forEach(([emotion, prob]) => {
          if (prob > maxProb) {
            maxProb = prob;
            maxEmotion = emotion;
          }
        });

        const newResult = {
          emotion: emotionMap[maxEmotion] || '平静',
          score: Math.round(maxProb * 100),
          timestamp: new Date().toISOString()
        };
        
        setCurrentEmotion(newResult);
        
        try {
          await apiClient.post('/emotions', newResult);
          fetchHistory(); // 刷新历史
        } catch (err) {
          console.error('保存识别结果失败:', err);
        }
      } else {
        console.log('未检测到人脸');
      }
    } catch (err) {
      console.error('AI 识别过程中出错:', err);
    } finally {
      setLoading(false);
    }
  }, [isCameraOpen, isModelsLoaded, fetchHistory]);

  const startRecording = useCallback((mediaStream) => {
    if (isRecording) return;
    
    recordedChunksRef.current = [];
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm';
    }
    
    try {
      const recorder = new MediaRecorder(mediaStream, options);
      mediaRecorderRef.current = recorder;
      recordingStartTimeRef.current = Date.now();
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'video/webm' });
        
        const formData = new FormData();
        formData.append('recording', file);
        formData.append('duration', duration);
        
        try {
          await apiClient.post('/recordings/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          fetchRecordings();
        } catch (err) {
          console.error('上传录制文件失败:', err);
        }
      };
      
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('启动录制失败:', err);
    }
  }, [isRecording, fetchRecordings]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setShouldRecord(false);
    }
  }, []);

  const openCamera = async () => {
    try {
      // 获取视频和音频流
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setStream(mediaStream);
      setIsCameraOpen(true);
      setAutoAnalyze(true);
      
      // 询问是否录制
      if (window.confirm('是否要录制摄像头内容（包括视频和音频）？\n注意：开启录制会将情绪分析信息实时合成到视频中。')) {
        setShouldRecord(true); // 设置标记，由 FloatingWindow 负责提供合成流
      }
    } catch (err) {
      console.error('无法访问摄像头或麦克风:', err);
      alert('无法访问摄像头或麦克风，请确保已授权。');
    }
  };

  const closeCamera = () => {
    if (isRecording) {
      stopRecording();
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
    setAutoAnalyze(false);
    setShouldRecord(false);
    setCurrentEmotion(null);
  };

  const handleDeleteOne = async (id) => {
    if (!window.confirm('确定要删除这条识别记录吗？')) return;
    try {
      await apiClient.delete(`/emotions/${id}`);
      setHistory(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      console.error('删除记录失败:', err);
      alert('删除失败，请稍后重试');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('确定要清空所有情绪识别历史吗？此操作不可撤销！')) return;
    try {
      await apiClient.delete('/emotions/history/all');
      setHistory([]);
    } catch (err) {
      console.error('清空历史失败:', err);
      alert('清空失败，请稍后重试');
    }
  };

  const handleDeleteRecording = async (id) => {
    if (!window.confirm('确定要删除这条录制记录吗？')) return;
    try {
      await apiClient.delete(`/recordings/${id}`);
      setRecordings(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      console.error('删除录制失败:', err);
      alert('删除失败，请稍后重试');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchHistory();
      fetchRecordings();
    }
  }, [fetchHistory, fetchRecordings]);

  const value = {
    isCameraOpen,
    stream,
    currentEmotion,
    loading,
    autoAnalyze,
    isModelsLoaded,
    modelLoadError,
    history,
    recordings,
    isRecording,
    shouldRecord,
    windowPos,
    windowSize,
    setWindowPos,
    setWindowSize,
    openCamera,
    closeCamera,
    startRecording,
    stopRecording,
    analyzeEmotion,
    fetchHistory,
    handleDeleteOne,
    handleDeleteAll,
    handleDeleteRecording,
    fetchRecordings,
    loadModels,
    videoElementRef
  };

  return (
    <EmotionContext.Provider value={value}>
      {children}
    </EmotionContext.Provider>
  );
};
