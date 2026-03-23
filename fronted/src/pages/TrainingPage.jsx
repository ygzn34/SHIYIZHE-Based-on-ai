// src/pages/TrainingPage.jsx
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';

function TrainingPage() {
  const [trainingTypes, setTrainingTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [training, setTraining] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // 记忆训练相关状态
  const [memoryPhase, setMemoryPhase] = useState('memorize'); // 'memorize' | 'select'
  const [memoryTimer, setMemoryTimer] = useState(10); // 记忆时间（秒）
  const [memoryContent, setMemoryContent] = useState(null); // 记忆内容（words, numbers, story等）
  const [memoryType, setMemoryType] = useState(null); // 记忆类型（words, numbers, image, story）

  // 获取训练类型
  useEffect(() => {
    const fetchTrainingTypes = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/trainings/types');
        setTrainingTypes(response.data.types);
      } catch (err) {
        console.error('Error fetching training types:', err);
        setError('获取训练类型失败：' + (err.response?.data?.msg || err.message));
      } finally {
        setLoading(false);
      }
    };
    fetchTrainingTypes();
  }, []);

  // 判断是否是记忆训练题目
  const isMemoryQuestion = (question) => {
    if (!question) return false;
    // 检查训练类型是否为记忆训练
    if (selectedType === 'memory') return true;
    // 检查题目类型是否包含"记忆"
    if (question.type && question.type.includes('记忆')) return true;
    // 检查是否有记忆相关字段
    if (question.words || question.numbers || question.story || question.imageDescription) return true;
    return false;
  };

  const isMultiSelectQuestion = (question) => {
    if (!question) return false;
    if (question.selectionType === 'multiple' || question.allowMultiple) return true;
    if (Array.isArray(question.correctAnswers) && question.correctAnswers.length > 1) return true;
    return false;
  };

  const hasAnsweredQuestion = (answer, question) => {
    if (!question) return false;
    if (isMultiSelectQuestion(question)) {
      return Array.isArray(answer) && answer.length > 0;
    }
    return answer !== undefined && answer !== null;
  };

  // 获取文件URL（处理本地路径和外部URL）
  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    // 如果是外部URL（http/https开头），直接返回
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    // 如果是本地路径，添加服务器地址
    return `http://localhost:3000${filePath}`;
  };

  // 获取记忆内容和类型
  const getMemoryContent = (question) => {
    if (!question) return { content: null, type: null };
    
    if (question.words && Array.isArray(question.words)) {
      return { content: question.words, type: 'words' };
    }
    if (question.numbers && Array.isArray(question.numbers)) {
      return { content: question.numbers, type: 'numbers' };
    }
    if (question.story) {
      return { content: question.story, type: 'story' };
    }
    if (question.imageDescription || question.imageUrl) {
      return { content: question.imageDescription || question.imageUrl, type: 'image' };
    }
    
    return { content: null, type: null };
  };

  const formatAnswerLabels = (answer, options = []) => {
    const normalized = Array.isArray(answer)
      ? [...answer]
      : (answer === undefined || answer === null ? [] : [answer]);
    const indices = normalized
      .map(idx => Number(idx))
      .filter(idx => !Number.isNaN(idx))
      .sort((a, b) => a - b);

    if (indices.length === 0) return '未作答';

    return indices
      .map(idx => {
        const label = String.fromCharCode(65 + idx);
        const text = options[idx] ?? '';
        return text ? `${label}. ${text}` : `${label}`;
      })
      .join('，');
  };

  // 生成训练题目
  const generateTraining = async (type) => {
    try {
      setGenerating(true);
      setError(null);
      const response = await apiClient.post('/trainings/generate', {
        trainingType: type
      });
      setTraining(response.data);
      setSelectedType(type);
      setCurrentQuestionIndex(0);
      const questionsCount = Array.isArray(response.data.questions) ? response.data.questions.length : 0;
      setAnswers(Array.from({ length: questionsCount }, () => null));
      setResults(null);
      setStartTime(Date.now());
      // 初始化记忆训练状态
      if (response.data.questions && response.data.questions[0]) {
        const firstQuestion = response.data.questions[0];
        if (isMemoryQuestion(firstQuestion)) {
          const { content, type: memType } = getMemoryContent(firstQuestion);
          setMemoryPhase('memorize');
          setMemoryTimer(10);
          setMemoryContent(content);
          setMemoryType(memType);
        } else {
          setMemoryPhase('select');
          setMemoryContent(null);
          setMemoryType(null);
        }
      }
    } catch (err) {
      console.error('Error generating training:', err);
      setError('生成训练题目失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setGenerating(false);
    }
  };

  // 选择答案
  const handleAnswerSelect = (answerIndex) => {
    if (!training || !training.questions || !training.questions[currentQuestionIndex]) return;
    const question = training.questions[currentQuestionIndex];
    const isMultiple = isMultiSelectQuestion(question);
    const newAnswers = [...answers];
    if (isMultiple) {
      const currentSelections = Array.isArray(newAnswers[currentQuestionIndex]) ? [...newAnswers[currentQuestionIndex]] : [];
      if (currentSelections.includes(answerIndex)) {
        newAnswers[currentQuestionIndex] = currentSelections.filter(idx => idx !== answerIndex);
      } else {
        newAnswers[currentQuestionIndex] = [...currentSelections, answerIndex].sort((a, b) => a - b);
      }
    } else {
      newAnswers[currentQuestionIndex] = answerIndex;
    }
    setAnswers(newAnswers);
  };

  // 下一题
  const handleNext = () => {
    if (currentQuestionIndex < training.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      // 重置记忆训练状态
      const nextQuestion = training.questions[currentQuestionIndex + 1];
      if (isMemoryQuestion(nextQuestion)) {
        const { content, type: memType } = getMemoryContent(nextQuestion);
        setMemoryPhase('memorize');
        setMemoryTimer(10);
        setMemoryContent(content);
        setMemoryType(memType);
      } else {
        setMemoryPhase('select');
        setMemoryContent(null);
        setMemoryType(null);
      }
    }
  };

  // 上一题
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      // 重置记忆训练状态
      const prevQuestion = training.questions[prevIndex];
      if (isMemoryQuestion(prevQuestion)) {
        const { content, type: memType } = getMemoryContent(prevQuestion);
        setMemoryPhase('memorize');
        setMemoryTimer(10);
        setMemoryContent(content);
        setMemoryType(memType);
      } else {
        setMemoryPhase('select');
        setMemoryContent(null);
        setMemoryType(null);
      }
    }
  };

  // 提交答案
  const handleSubmit = async (completed = true) => {
    try {
      setSubmitting(true);
      setError(null);
      const response = await apiClient.post('/trainings/submit', {
        trainingType: selectedType,
        questions: training.questions,
        answers: answers,
        completed: completed
      });
      setResults(response.data);
    } catch (err) {
      console.error('Error submitting answers:', err);
      setError('提交答案失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // 中途退出
  const handleExit = () => {
    setShowExitConfirm(true);
  };

  // 确认退出
  const confirmExit = async () => {
    setShowExitConfirm(false);
    await handleSubmit(false);
  };

  // 取消退出
  const cancelExit = () => {
    setShowExitConfirm(false);
  };

  // 重新开始
  const handleRestart = () => {
    setTraining(null);
    setSelectedType(null);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setResults(null);
    setStartTime(null);
  };

  // 计算进度
  const getProgress = () => {
    if (!training) return 0;
    return ((currentQuestionIndex + 1) / training.questions.length) * 100;
  };

  // 计算已用时间
  const getElapsedTime = () => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
  };

  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 记忆训练倒计时效果
  useEffect(() => {
    if (memoryPhase === 'memorize' && memoryTimer > 0) {
      const timer = setTimeout(() => {
        setMemoryTimer(memoryTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (memoryPhase === 'memorize' && memoryTimer === 0) {
      // 时间到了，切换到选择阶段
      setMemoryPhase('select');
    }
  }, [memoryPhase, memoryTimer]);

  // 当题目切换时，重置记忆训练状态
  useEffect(() => {
    if (training && training.questions && training.questions[currentQuestionIndex]) {
      const question = training.questions[currentQuestionIndex];
      if (isMemoryQuestion(question)) {
        const { content, type: memType } = getMemoryContent(question);
        setMemoryPhase('memorize');
        setMemoryTimer(10);
        setMemoryContent(content);
        setMemoryType(memType);
      } else {
        setMemoryPhase('select');
        setMemoryContent(null);
        setMemoryType(null);
      }
    }
  }, [currentQuestionIndex, training, selectedType]);

  // 如果正在加载训练类型
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
            康复训练
          </h1>
          <p className="text-gray-600 text-lg">加载中...</p>
        </div>
      </div>
    );
  }

  // 如果显示结果
  if (results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-xl bg-white/70 rounded-2xl p-8 shadow-xl border border-white/20">
            {/* 标题 */}
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent text-center mb-8">
              {results.trainingName} - 训练结果
            </h1>

            {/* 评分卡片 */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-purple-100/80 to-blue-100/80 rounded-2xl p-8 mb-8 text-center shadow-xl border-2 border-purple-300/50">
              <div className="text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-4">
                {results.evaluation.score}分
              </div>
              <div className="text-xl text-gray-700 font-semibold">
                正确率: <span className="text-purple-600">{results.accuracy}%</span> ({results.correctCount}/{results.answeredQuestions})
              </div>
            </div>

            {/* 评价内容 */}
            <div className="mb-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">总体评价</h3>
                <div className="backdrop-blur-xl bg-gradient-to-br from-blue-50/80 to-purple-50/80 rounded-xl p-6 text-lg leading-relaxed text-gray-700 border border-blue-200/50">
                  {results.evaluation.overallComment}
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">详细分析</h3>
                <div className="backdrop-blur-xl bg-white/60 rounded-xl p-6 text-base leading-relaxed text-gray-600 whitespace-pre-wrap border border-gray-200/50">
                  {results.evaluation.detailedAnalysis}
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">鼓励建议</h3>
                <div className="backdrop-blur-xl bg-gradient-to-br from-yellow-50/80 to-orange-50/80 rounded-xl p-6 text-base leading-relaxed text-yellow-800 whitespace-pre-wrap border border-yellow-200/50">
                  {results.evaluation.encouragement}
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">下一步建议</h3>
                <div className="backdrop-blur-xl bg-gradient-to-br from-green-50/80 to-emerald-50/80 rounded-xl p-6 text-base leading-relaxed text-green-800 whitespace-pre-wrap border border-green-200/50">
                  {results.evaluation.nextSteps}
                </div>
              </div>
            </div>

            {/* 答题详情 */}
            {results.results && results.results.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">答题详情</h3>
                <div className="space-y-4">
                  {results.results.map((result, index) => (
                    <div 
                      key={index} 
                      className={`backdrop-blur-xl rounded-xl p-6 border-2 ${
                        result.isCorrect 
                          ? 'bg-gradient-to-br from-green-50/80 to-emerald-50/80 border-green-400/50' 
                          : 'bg-gradient-to-br from-red-50/80 to-pink-50/80 border-red-400/50'
                      }`}
                    >
                      <div className="font-bold mb-2 text-gray-800 text-lg">
                        题目 {index + 1}: {result.question}
                      </div>
                      <div className={`font-semibold ${result.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        {result.isCorrect
                          ? '✓ 回答正确'
                          : `✗ 回答错误（正确答案：${formatAnswerLabels(
                              result.correctAnswers && result.correctAnswers.length
                                ? result.correctAnswers
                                : result.correctAnswer,
                              result.options || []
                            )}）`}
                      </div>
                      <div className="mt-2 text-gray-700">
                        您的作答：{formatAnswerLabels(result.userAnswer, result.options || [])}
                      </div>
                      {!result.isCorrect && result.hint && (
                        <div className="mt-2 text-yellow-700 italic">
                          提示：{result.hint}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-center">
              <button
                onClick={handleRestart}
                className="px-8 py-4 backdrop-blur-md bg-gradient-to-r from-purple-500/80 via-blue-600/80 to-pink-500/80 hover:from-purple-500/90 hover:via-blue-600/90 hover:to-pink-500/90 text-white rounded-xl font-bold text-lg transition-all duration-300 border border-white/40 shadow-xl transform hover:scale-105"
                style={{
                  boxShadow: '0 8px 25px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                }}
              >
                重新开始训练
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 如果正在训练
  if (training) {
    const currentQuestion = training.questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === training.questions.length - 1;
    const answeredCount = training.questions.reduce((count, question, idx) => {
      return hasAnsweredQuestion(answers[idx], question) ? count + 1 : count;
    }, 0);
    const allAnswered = training.questions.length > 0 && answeredCount === training.questions.length;
    const isMultipleCurrent = isMultiSelectQuestion(currentQuestion);
    
    // 从当前题目获取记忆内容和类型（确保总是最新的）
    const { content: currentMemoryContent, type: currentMemoryType } = getMemoryContent(currentQuestion);
    
    // 调试信息
    if (isMemoryQuestion(currentQuestion) && memoryPhase === 'memorize') {
      console.log('记忆训练调试信息:', {
        currentQuestion,
        currentMemoryType,
        currentMemoryContent,
        memoryType,
        memoryContent,
        memoryPhase,
        memoryTimer
      });
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-xl bg-white/70 rounded-2xl p-8 shadow-xl border border-white/20">
            {/* 头部信息 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b-2 border-purple-200/50 gap-4">
              <div className="flex-1">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  {training.title}
                </h2>
                <div className="text-gray-600 text-sm">
                  {training.instructions}
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-gray-600 text-sm font-medium">
                  预计时长: <span className="text-purple-600">{training.duration}</span>分钟
                </div>
                <div className="text-gray-600 text-sm font-medium">
                  已用时间: <span className="text-purple-600">{formatTime(getElapsedTime())}</span>
                </div>
              </div>
            </div>

            {/* 进度条 */}
            <div className="mb-8">
              <div className="flex justify-between mb-2 text-sm text-gray-600 font-medium">
                <span>题目 {currentQuestionIndex + 1} / {training.questions.length}</span>
                <span>{Math.round(getProgress())}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 transition-all duration-300 rounded-full"
                  style={{ width: `${getProgress()}%` }}
                />
              </div>
            </div>

            {/* 题目内容 */}
            <div className="mb-8">
              {/* 非记忆训练题目显示题目，记忆训练题目只在记忆阶段显示题目（在选择阶段不显示） */}
              {!isMemoryQuestion(currentQuestion) && (
                <h3 className="text-2xl font-bold text-gray-800 mb-6 leading-relaxed">
                  {currentQuestion.question}
                </h3>
              )}

              {/* 记忆训练：显示记忆内容阶段（倒计时期间显示题目和记忆内容） */}
              {isMemoryQuestion(currentQuestion) && memoryPhase === 'memorize' && (
                <div className="mb-8 p-8 backdrop-blur-xl bg-gradient-to-br from-purple-50/80 to-blue-50/80 rounded-2xl text-center shadow-xl border-2 border-purple-300/50">
                  {/* 在倒计时期间显示题目 */}
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 leading-relaxed text-left">
                    {currentQuestion.question}
                  </h3>
                  
                  <h4 className="text-xl font-semibold text-gray-700 mb-6">
                    {(currentMemoryType || memoryType) === 'words' && '请记住以下词语'}
                    {(currentMemoryType || memoryType) === 'numbers' && '请记住以下数字序列'}
                    {(currentMemoryType || memoryType) === 'story' && '请记住以下故事内容'}
                    {(currentMemoryType || memoryType) === 'image' && '请仔细观察以下图片'}
                    {(!currentMemoryType && !memoryType) && '请记住以下内容'}
                    <span className="text-purple-600 ml-2">（{memoryTimer}秒后消失）</span>
                  </h4>
                
                  {/* 显示词语 */}
                  {((currentMemoryType || memoryType) === 'words') && (currentMemoryContent || memoryContent) && Array.isArray(currentMemoryContent || memoryContent) && (
                    <div className="flex flex-wrap gap-4 justify-center mb-6">
                      {(currentMemoryContent || memoryContent || []).map((word, index) => (
                        <div
                          key={index}
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-lg font-semibold shadow-lg animate-fadeIn"
                        >
                          {word}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 显示数字序列 */}
                  {((currentMemoryType || memoryType) === 'numbers') && (
                    <div className="flex flex-wrap gap-4 justify-center mb-6">
                      {Array.isArray(currentMemoryContent || memoryContent) && (currentMemoryContent || memoryContent || []).length > 0 ? (
                        (currentMemoryContent || memoryContent || []).map((num, index) => (
                          <div
                            key={index}
                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-2xl font-bold shadow-lg animate-fadeIn"
                          >
                            {num}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-600 text-lg">暂无数字序列数据</div>
                      )}
                    </div>
                  )}

                  {/* 显示故事内容 */}
                  {((currentMemoryType || memoryType) === 'story') && (
                    <div className="p-6 backdrop-blur-xl bg-white/80 rounded-xl mb-6 text-left text-lg leading-relaxed text-gray-700 shadow-lg border border-purple-200/50 animate-fadeIn">
                      {currentMemoryContent || memoryContent || '暂无故事内容'}
                    </div>
                  )}

                  {/* 显示图片（记忆图片类型） */}
                  {((currentMemoryType || memoryType) === 'image') && currentQuestion.imageUrl && (
                    <div className="mb-6 text-center">
                      <img 
                        src={getFileUrl(currentQuestion.imageUrl)} 
                        alt={currentQuestion.imageDescription || '记忆图片'}
                        className="max-w-full max-h-96 rounded-xl shadow-xl border-2 border-purple-200/50 animate-fadeIn"
                        onError={(e) => {
                          console.error('图片加载失败:', currentQuestion.imageUrl);
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* 倒计时显示 */}
                  <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mt-4">
                    {memoryTimer}
                  </div>
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(-10px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fadeIn {
                      animation: fadeIn 0.5s ease-in;
                    }
                  `}</style>
                </div>
              )}

              {/* 显示图片（非记忆训练题目的图片） */}
              {!isMemoryQuestion(currentQuestion) && currentQuestion.imageUrl && (
                <div className="mb-6 text-center">
                  <img 
                    src={getFileUrl(currentQuestion.imageUrl)} 
                    alt={currentQuestion.imageDescription || '题目图片'}
                    className="max-w-full max-h-96 rounded-xl shadow-xl border-2 border-purple-200/50"
                    onError={(e) => {
                      console.error('图片加载失败:', currentQuestion.imageUrl);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* 记忆训练：选择阶段提示 */}
              {isMemoryQuestion(currentQuestion) && memoryPhase === 'select' && (
                <div className="mb-6 p-6 backdrop-blur-xl bg-gradient-to-br from-yellow-50/80 to-orange-50/80 rounded-xl border-2 border-yellow-400/50 text-center shadow-lg">
                  <p className="text-lg text-yellow-800 font-semibold">
                    时间到！请从以下选项中选择正确答案：
                  </p>
                </div>
              )}

              {/* 选项 - 记忆训练题目在选择阶段显示，非记忆训练题目直接显示 */}
              {((isMemoryQuestion(currentQuestion) && memoryPhase === 'select') || !isMemoryQuestion(currentQuestion)) && (
                <div className="flex flex-col gap-4">
                  {isMultipleCurrent && (
                    <div className="text-sm text-purple-700 font-semibold bg-purple-50/80 border border-purple-200/80 rounded-lg px-4 py-2">
                      提示：本题支持多选，请选择所有符合的选项。
                    </div>
                  )}
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = isMultipleCurrent
                      ? Array.isArray(currentAnswer) && currentAnswer.includes(index)
                      : currentAnswer === index;
                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        className={`px-6 py-4 text-left rounded-xl font-medium transition-all duration-300 backdrop-blur-md border ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-500/80 via-blue-500/80 to-pink-500/80 text-white shadow-xl transform scale-105 border-white/40'
                            : 'bg-white/60 text-gray-700 border-white/30 hover:border-purple-300/60 hover:bg-white/80 hover:shadow-lg'
                        }`}
                        style={isSelected ? {
                          boxShadow: '0 8px 25px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                        } : {
                          boxShadow: '0 4px 15px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)'
                        }}
                      >
                        <span className="font-bold mr-2">{String.fromCharCode(65 + index)}.</span> {option}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8">
              <button
                onClick={handleExit}
                className="px-6 py-3 backdrop-blur-md bg-gray-500/70 hover:bg-gray-500/80 text-white rounded-xl font-semibold transition-all duration-300 border border-white/30 shadow-lg hover:shadow-xl transform hover:scale-105"
                style={{
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)'
                }}
              >
                退出训练
              </button>

              <div className="flex gap-4">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 backdrop-blur-md border ${
                    currentQuestionIndex === 0
                      ? 'bg-gray-300/60 text-gray-500 cursor-not-allowed border-gray-200/30'
                      : 'bg-gray-500/70 hover:bg-gray-500/80 text-white border-white/30 hover:shadow-xl transform hover:scale-105 shadow-lg'
                  }`}
                  style={currentQuestionIndex === 0 ? {} : {
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}
                >
                  上一题
                </button>

                {isLastQuestion ? (
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={!allAnswered || submitting}
                    className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 backdrop-blur-md border ${
                      allAnswered && !submitting
                        ? 'bg-gradient-to-r from-green-500/80 to-emerald-600/80 hover:from-green-500/90 hover:to-emerald-600/90 text-white border-white/40 hover:shadow-xl transform hover:scale-105 shadow-lg'
                        : 'bg-gray-300/60 text-gray-500 cursor-not-allowed border-gray-200/30'
                    }`}
                    style={allAnswered && !submitting ? {
                      boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                    } : {}}
                  >
                    {submitting ? '提交中...' : '完成训练'}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-6 py-3 backdrop-blur-md bg-gradient-to-r from-purple-500/80 via-blue-600/80 to-pink-500/80 hover:from-purple-500/90 hover:via-blue-600/90 hover:to-pink-500/90 text-white rounded-xl font-semibold transition-all duration-300 border border-white/40 shadow-lg hover:shadow-xl transform hover:scale-105"
                    style={{
                      boxShadow: '0 8px 25px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                    }}
                  >
                    下一题
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 退出确认对话框 */}
          {showExitConfirm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="backdrop-blur-xl bg-white/90 rounded-2xl p-8 max-w-md shadow-2xl border border-white/20">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  确认退出训练？
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  您已完成 {answeredCount} / {training.questions.length} 道题目。
                  退出后可以查看已完成的题目评价，建议休息后再继续训练。
                </p>
                <div className="flex gap-4 justify-end">
                  <button
                    onClick={cancelExit}
                    className="px-6 py-2 backdrop-blur-md bg-gray-500/70 hover:bg-gray-500/80 text-white rounded-xl font-semibold transition-all duration-300 border border-white/30 shadow-lg hover:shadow-xl"
                    style={{
                      boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)'
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmExit}
                    className="px-6 py-2 backdrop-blur-md bg-red-500/80 hover:bg-red-500/90 text-white rounded-xl font-semibold transition-all duration-300 border border-white/40 shadow-lg hover:shadow-xl"
                    style={{
                      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                    }}
                  >
                    确认退出
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 训练类型选择界面
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 标题区域 */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-4">
            康复训练
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            选择适合的训练类型，帮助改善认知功能。每次训练时长控制在3-10分钟，避免疲劳。
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-xl backdrop-blur-sm max-w-4xl mx-auto">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {trainingTypes.map((type, index) => {
            // 为每个训练类型定义不同的颜色主题
            const colorThemes = [
              { primary: '#3b82f6', light: 'from-blue-100/80 to-blue-200/80', hover: 'hover:from-blue-200/90 hover:to-blue-300/90', border: 'border-blue-400/50', text: 'text-blue-700' }, // 蓝色主题
              { primary: '#10b981', light: 'from-green-100/80 to-green-200/80', hover: 'hover:from-green-200/90 hover:to-green-300/90', border: 'border-green-400/50', text: 'text-green-700' }, // 绿色主题
              { primary: '#f59e0b', light: 'from-yellow-100/80 to-yellow-200/80', hover: 'hover:from-yellow-200/90 hover:to-yellow-300/90', border: 'border-yellow-400/50', text: 'text-yellow-700' }, // 黄色主题
              { primary: '#ef4444', light: 'from-red-100/80 to-red-200/80', hover: 'hover:from-red-200/90 hover:to-red-300/90', border: 'border-red-400/50', text: 'text-red-700' }, // 红色主题
              { primary: '#8b5cf6', light: 'from-purple-100/80 to-purple-200/80', hover: 'hover:from-purple-200/90 hover:to-purple-300/90', border: 'border-purple-400/50', text: 'text-purple-700' }, // 紫色主题
              { primary: '#06b6d4', light: 'from-cyan-100/80 to-cyan-200/80', hover: 'hover:from-cyan-200/90 hover:to-cyan-300/90', border: 'border-cyan-400/50', text: 'text-cyan-700' }  // 青色主题
            ];
            const theme = colorThemes[index % colorThemes.length];
            
            return (
              <div
                key={type.id}
                className={`backdrop-blur-xl bg-gradient-to-br ${theme.light} ${theme.hover} rounded-2xl p-6 shadow-xl border-2 ${theme.border} transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-2xl ${generating ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={() => !generating && generateTraining(type.id)}
              >
                <h2 className={`text-2xl font-bold mb-4 ${theme.text}`}>
                  {type.name}
                </h2>
                <div className="text-gray-700 mb-6 text-sm leading-relaxed">
                  {type.description}
                </div>
                <div className="flex justify-between items-center pt-4 border-t-2 border-white/30">
                  <div className={`font-semibold text-sm ${theme.text}`}>
                    预计时长: {type.duration}
                  </div>
                  <button
                    className={`px-4 py-2 rounded-xl font-semibold text-sm shadow-lg transform hover:scale-110 transition-all duration-300 backdrop-blur-md border border-white/30 ${generating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.primary}80, ${theme.primary}60)`,
                      color: 'white',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!generating) generateTraining(type.id);
                    }}
                    disabled={generating}
                  >
                    开始训练
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 生成题目时的加载提示 */}
        {generating && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="backdrop-blur-xl bg-white/90 rounded-2xl p-8 max-w-md shadow-2xl border border-white/20 text-center">
              {/* 加载动画 */}
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-6"></div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-4">
                正在生成题目
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                AI正在为您生成个性化的训练题目，请稍候...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrainingPage;

