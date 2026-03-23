import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEmotion } from '../contexts/EmotionContext';

function FloatingEmotionWindow() {
  const { 
    isCameraOpen, 
    stream, 
    currentEmotion, 
    loading, 
    closeCamera, 
    windowPos, 
    setWindowPos, 
    windowSize, 
    setWindowSize,
    isRecording,
    shouldRecord,
    startRecording,
    analyzeEmotion,
    autoAnalyze,
    isModelsLoaded,
    videoElementRef
  } = useEmotion();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);

  // 设置全局视频元素引用
  useEffect(() => {
    if (videoRef.current && videoElementRef) {
      videoElementRef.current = videoRef.current;
    }
    return () => {
      if (videoElementRef) {
        videoElementRef.current = null;
      }
    };
  }, [videoElementRef]);

  // 主动识别逻辑：移至此处，因为需要访问 videoRef
  useEffect(() => {
    let interval;
    if (isCameraOpen && autoAnalyze && isModelsLoaded && videoRef.current) {
      interval = setInterval(() => {
        analyzeEmotion(videoRef.current);
      }, 5000); // 提高频率至 5 秒一次
    }
    return () => clearInterval(interval);
  }, [isCameraOpen, autoAnalyze, isModelsLoaded, analyzeEmotion]);

  // 合成 Canvas 的渲染循环
  const renderComposite = useCallback(() => {
    if (!canvasRef.current || !videoRef.current || !isCameraOpen) return;
    
    // 增加视频状态检查，确保视频已准备好
    if (videoRef.current.readyState < 2) {
      requestRef.current = requestAnimationFrame(renderComposite);
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // 避免除以 0
    const safeWindowWidth = windowSize.width || 400;
    const scale = width / safeWindowWidth; 
    
    try {
      // 1. 绘制视频帧
      ctx.drawImage(videoRef.current, 0, 0, width, height);
      
      // 2. 绘制扫描线装饰
      const scanPos = (Date.now() % 3000) / 3000;
      ctx.beginPath();
      ctx.moveTo(0, height * scanPos);
      ctx.lineTo(width, height * scanPos);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();

      // 3. 绘制情绪分析结果 (如果存在)
      if (currentEmotion) {
        // 绘制底部背景板
        const margin = 20 * scale;
        const rectHeight = 60 * scale;
        const rectY = height - rectHeight - margin;
        
        // 半透明圆角背景 - 增加兼容性处理
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(margin, rectY, width - margin * 2, rectHeight, 12 * scale);
        } else {
          // Fallback for browsers that don't support roundRect
          ctx.rect(margin, rectY, width - margin * 2, rectHeight);
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();

        // 绘制表情
        ctx.font = `${24 * scale}px Arial`;
        const emoji = currentEmotion.emotion === '开心' ? '😊' : 
                      currentEmotion.emotion === '平静' ? '😐' : 
                      currentEmotion.emotion === '惊讶' ? '😮' : 
                      currentEmotion.emotion === '难过' ? '😢' : '😠';
        ctx.fillText(emoji, margin + 15 * scale, rectY + 38 * scale);

        // 绘制文字
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${16 * scale}px sans-serif`;
        ctx.fillText(currentEmotion.emotion, margin + 55 * scale, rectY + 35 * scale);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = `${10 * scale}px sans-serif`;
        ctx.fillText(new Date(currentEmotion.timestamp).toLocaleTimeString(), margin + 55 * scale, rectY + 50 * scale);

        // 绘制置信度
        ctx.fillStyle = '#60A5FA';
        ctx.font = `bold ${16 * scale}px sans-serif`;
        const scoreText = `${currentEmotion.score}%`;
        const scoreWidth = ctx.measureText(scoreText).width;
        ctx.fillText(scoreText, width - margin - 15 * scale - scoreWidth, rectY + 35 * scale);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = `${10 * scale}px sans-serif`;
        const labelText = '置信度';
        const labelWidth = ctx.measureText(labelText).width;
        ctx.fillText(labelText, width - margin - 15 * scale - labelWidth, rectY + 50 * scale);
      }
    } catch (renderError) {
      console.error('Canvas 渲染出错:', renderError);
    }

    requestRef.current = requestAnimationFrame(renderComposite);
  }, [isCameraOpen, currentEmotion, windowSize.width]);

  // 当摄像头开启且视频元素渲染后，挂载流
  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      
      // 启动 Canvas 渲染循环
      requestRef.current = requestAnimationFrame(renderComposite);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isCameraOpen, stream, renderComposite]);

  // 处理录制启动
  useEffect(() => {
    if (isCameraOpen && shouldRecord && !isRecording && canvasRef.current && stream) {
      // 1. 从 Canvas 获取视频流 (30fps)
      const canvasStream = canvasRef.current.captureStream(30);
      
      // 2. 合并音频流 (从原始 getUserMedia 流中提取)
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        canvasStream.addTrack(audioTracks[0]);
      }
      
      // 3. 开始录制
      startRecording(canvasStream);
    }
  }, [isCameraOpen, shouldRecord, isRecording, stream, startRecording]);

  // 拖拽处理
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - windowPos.x,
        y: e.clientY - windowPos.y
      });
    }
  };

  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setWindowPos({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
      if (isResizing) {
        setWindowSize({
          width: Math.max(300, e.clientX - windowPos.x),
          height: Math.max(200, e.clientY - windowPos.y)
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, windowPos, setWindowPos, setWindowSize]);

  if (!isCameraOpen) return null;

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: windowPos.x,
        top: windowPos.y,
        width: windowSize.width,
        height: windowSize.height,
        zIndex: 2000,
      }}
      className="bg-black rounded-2xl shadow-2xl overflow-hidden border-2 border-white/20 flex flex-col group"
    >
      {/* 标题栏（拖拽柄） */}
      <div className="drag-handle h-10 bg-slate-800 flex items-center justify-between px-4 cursor-move select-none">
        <div className="flex items-center">
          <span className={`w-2 h-2 rounded-full mr-2 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
          <span className="text-xs font-bold text-white">
            {isRecording ? '正在录制...' : '实时视频流'}
          </span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            closeCamera();
          }}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* 视频内容 */}
      <div className="flex-1 relative bg-slate-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* 隐藏的合成 Canvas */}
        <canvas
          ref={canvasRef}
          width={windowSize.width * 2} // 双倍分辨率以获得更好的清晰度
          height={windowSize.height * 2}
          className="hidden"
        />
        
        {/* 情绪分析结果悬浮层 - 用户在页面上看到的实时 UI */}
        {currentEmotion && (
          <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {currentEmotion.emotion === '开心' ? '😊' : 
                   currentEmotion.emotion === '平静' ? '😐' : 
                   currentEmotion.emotion === '惊讶' ? '😮' : 
                   currentEmotion.emotion === '难过' ? '😢' : '😠'}
                </div>
                <div>
                  <p className="text-white text-sm font-bold">{currentEmotion.emotion}</p>
                  <p className="text-white/60 text-[10px]">{new Date(currentEmotion.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-400 text-sm font-mono font-bold">{currentEmotion.score}%</p>
                <p className="text-white/40 text-[10px]">置信度</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}
        
        {/* 装饰性扫描线 */}
        <div className="absolute inset-0 pointer-events-none border border-white/10 overflow-hidden">
           <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent absolute top-0 animate-[scan_3s_linear_infinite]"></div>
        </div>
      </div>

      {/* 缩放柄 */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center"
      >
        <div className="w-2 h-2 border-r-2 border-b-2 border-white/50"></div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}

export default FloatingEmotionWindow;
