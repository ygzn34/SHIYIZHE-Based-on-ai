// controllers/trainingController.js
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// 训练类型配置
const TRAINING_TYPES = {
  memory: {
    name: '记忆功能训练',
    duration: '3-5分钟',
    description: '帮助患者改善记忆能力，训练时长控制在3-5分钟，避免患者疲劳。若患者记忆错误，避免直接否定，可温和提示。'
  },
  attention: {
    name: '注意力和集中力训练',
    duration: '5-8分钟',
    description: '从简单、无干扰的任务开始，完成后再逐步增加任务难度，训练环境需保持安静。'
  },
  reasoning: {
    name: '推理及解决问题的训练',
    duration: '5-10分钟',
    description: '问题难度需匹配患者能力，避免过难导致挫败感，鼓励患者自主思考。'
  },
  agnosia: {
    name: '失认症训练',
    duration: '5-8分钟',
    description: '改善患者对物品、人物、空间的识别能力，减少定向障碍与误认风险。'
  }
};

const normalizeQuestionSelection = (question = {}) => {
  if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
    question.selectionType = question.selectionType === 'multiple' || question.allowMultiple ? 'multiple' : 'single';
    if (question.selectionType !== 'multiple') {
      delete question.correctAnswers;
      question.allowMultiple = false;
    }
    return question;
  }

  const optionEntries = question.options.map((option, index) => ({
    option,
    originalIndex: index
  }));

  for (let i = optionEntries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [optionEntries[i], optionEntries[j]] = [optionEntries[j], optionEntries[i]];
  }

  question.options = optionEntries.map(entry => entry.option);

  const hasExplicitMultiple = question.selectionType === 'multiple' || question.allowMultiple === true;
  const hasMultipleAnswers = Array.isArray(question.correctAnswers) && question.correctAnswers.length > 1;
  const baseAnswers = Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0
    ? question.correctAnswers
    : Array.isArray(question.correctAnswer)
      ? question.correctAnswer
      : typeof question.correctAnswer === 'number'
        ? [question.correctAnswer]
        : [];

  const shouldBeMultiple = hasExplicitMultiple || hasMultipleAnswers || baseAnswers.length > 1;

  if (shouldBeMultiple) {
    question.selectionType = 'multiple';
    question.allowMultiple = true;

    const originalSet = new Set(baseAnswers);
    question.correctAnswers = optionEntries
      .map((entry, idx) => (originalSet.has(entry.originalIndex) ? idx : null))
      .filter(idx => idx !== null);

    if (question.correctAnswers.length <= 1) {
      question.selectionType = 'single';
      question.allowMultiple = false;
      question.correctAnswer = question.correctAnswers[0] ?? 0;
      delete question.correctAnswers;
    }
  } else {
    question.selectionType = 'single';
    question.allowMultiple = false;
    const originalCorrect = baseAnswers[0] ?? 0;
    const mappedIndex = optionEntries.findIndex(entry => entry.originalIndex === originalCorrect);
    question.correctAnswer = mappedIndex >= 0 ? mappedIndex : 0;
    delete question.correctAnswers;
  }

  return question;
};

// 生成训练题目
exports.generateTraining = async (req, res) => {
  try {
    const { trainingType } = req.body;

    if (!trainingType || !TRAINING_TYPES[trainingType]) {
      return res.status(400).json({ msg: '无效的训练类型' });
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      return res.status(500).json({ msg: 'DeepSeek API Key未配置' });
    }

    const trainingConfig = TRAINING_TYPES[trainingType];
    
    // 根据训练类型生成不同的提示词
    let prompt = '';
    
    const variationToken = `${trainingType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const uniquenessReminder = `
重要要求：
1. 你正在为阿尔茨海默症患者生成"${trainingConfig.name}"的全新闯关题目，禁止复用或简单改写过往题目。
2. 变体编号：${variationToken}。请根据该编号让题目内容、选项、提示均具唯一性。
3. 题干、选项、提示与图片/故事描述都要围绕本次变体重新创作，确保不同调用返回不同题目。
4. 只输出JSON，不能包含多余解释。
5. 每道题的选项顺序要随机，不能让正确答案固定在第一个选项。
6. 如需多选，请设置"selectionType": "multiple"并提供"correctAnswers"（索引数组），题干中也要提示“此题可多选”；单选题使用"selectionType": "single"与"correctAnswer"索引。
7. 所有题目必须完全用文字描述，严禁包含imageDescription、imageUrl或任何图片生成指示。`;

    switch (trainingType) {
      case 'memory':
        prompt = `请为阿尔茨海默症患者生成一个记忆功能训练题目。要求：
1. 难度从简单到适中，适合轻度到中度认知障碍患者
2. 题目类型可以是：记忆单词、记忆数字序列、记忆故事细节、记忆文字描述的场景等（禁止要求图片或任何图像生成）
3. 题目数量：3-5个小题，总时长控制在3-5分钟
4. 题目要温和、鼓励，避免挫败感
5. 如果是记忆单词类型的题目，请在题目中包含"words"字段，包含3-5个需要记忆的词语
6. 所有题干和提示只能使用文字描述，不得包含imageDescription、imageUrl或任何生成图片的指令
7. 请按照以下JSON格式返回：
{
  "title": "训练标题",
  "instructions": "训练说明（简短，鼓励性）",
  "questions": [
    {
      "id": 1,
      "type": "题目类型（如：记忆单词、记忆数字、记忆图片等）",
      "question": "题目内容",
      "options": ["选项1", "选项2", "选项3", "选项4"],
      "selectionType": "single或multiple",
      "correctAnswer": 0（当selectionType为single时使用，值为正确选项的索引）,
      "correctAnswers": [0,2]（当selectionType为multiple时使用，值为所有正确选项的索引数组）,
      "hint": "提示信息（如果患者答错时的温和提示）",
      "words": ["词语1", "词语2", "词语3"]（仅记忆单词类型需要）
    }
  ],
  "duration": "预计时长（分钟）"
}
只返回JSON格式，不要包含其他文字说明。${uniquenessReminder}`;
        break;
        
      case 'attention':
        prompt = `请为阿尔茨海默症患者生成一个注意力和集中力训练题目。要求：
1. 难度从简单到适中，从单一任务开始
2. 题目类型可以是：找不同、数数、连线、分类等
3. 题目数量：2-4个小题，总时长控制在5-8分钟
4. 题目要简单明了，避免干扰
5. 所有题干与提示只能用文字表达，不得包含imageDescription、imageUrl或任何图片生成指令
6. 请按照以下JSON格式返回：
{
  "title": "训练标题",
  "instructions": "训练说明（简短，鼓励性）",
  "questions": [
    {
      "id": 1,
      "type": "题目类型（如：找不同、数数、连线等）",
      "question": "题目内容",
      "options": ["选项1", "选项2", "选项3", "选项4"],
      "selectionType": "single或multiple",
      "correctAnswer": 0（selectionType为single时使用）,
      "correctAnswers": [1,3]（selectionType为multiple时使用，值为正确选项索引数组）,
      "hint": "提示信息"
    }
  ],
  "duration": "预计时长（分钟）"
}
只返回JSON格式，不要包含其他文字说明。${uniquenessReminder}`;
        break;
        
      case 'reasoning':
        prompt = `请为阿尔茨海默症患者生成一个推理及解决问题的训练题目。要求：
1. 难度从简单到适中，匹配患者能力
2. 题目类型可以是：逻辑推理、因果关系、排序、选择等
3. 题目数量：2-3个小题，总时长控制在5-10分钟
4. 鼓励患者自主思考，不直接给出答案
5. 所有题干与提示必须以文字呈现，不得包含imageDescription、imageUrl或任何图片生成需求
6. 请按照以下JSON格式返回：
{
  "title": "训练标题",
  "instructions": "训练说明（简短，鼓励性）",
  "questions": [
    {
      "id": 1,
      "type": "题目类型（如：逻辑推理、因果关系等）",
      "question": "题目内容",
      "options": ["选项1", "选项2", "选项3", "选项4"],
      "selectionType": "single或multiple",
      "correctAnswer": 0（selectionType为single时使用）,
      "correctAnswers": [0,3]（selectionType为multiple时使用，值为索引数组）,
      "hint": "提示信息（鼓励思考）"
    }
  ],
  "duration": "预计时长（分钟）"
}
只返回JSON格式，不要包含其他文字说明。${uniquenessReminder}`;
        break;
        
      case 'agnosia':
        prompt = `请为阿尔茨海默症患者生成一个失认症训练题目。要求：
1. 难度从简单到适中，针对性训练
2. 题目类型可以是：物品识别、人物识别、空间识别、颜色识别等
3. 题目数量：3-5个小题，总时长控制在5-8分钟
4. 使用固定、清晰的文字描述，减少认知负担，禁止要求生成或提供图片
5. 请按照以下JSON格式返回：
{
  "title": "训练标题",
  "instructions": "训练说明（简短，鼓励性）",
  "questions": [
    {
      "id": 1,
      "type": "题目类型（如：物品识别、人物识别等）",
      "question": "题目内容",
      "options": ["选项1", "选项2", "选项3", "选项4"],
      "selectionType": "single或multiple",
      "correctAnswer": 0（selectionType为single时使用）,
      "correctAnswers": [1,2]（selectionType为multiple时使用，值为索引数组）,
      "hint": "提示信息"
    }
  ],
  "duration": "预计时长（分钟）"
}
只返回JSON格式，不要包含其他文字说明。${uniquenessReminder}`;
        break;
    }

    // 调用DeepSeek API
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${deepseekApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 解析AI返回的内容
    const aiResponse = response.data.choices[0].message.content.trim();
    
    // 尝试提取JSON
    let jsonStr = aiResponse;
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    let trainingData;
    try {
      trainingData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      return res.status(500).json({ 
        msg: 'AI返回格式解析失败',
        rawResponse: aiResponse 
      });
    }

    // 仅保留文本内容，剔除任何潜在的图像字段并统一选项信息
    if (trainingData.questions && Array.isArray(trainingData.questions)) {
      trainingData.questions = trainingData.questions.map(question => {
        if (question) {
          delete question.imageDescription;
          delete question.imageUrl;
        }
        return normalizeQuestionSelection(question);
      });
    }

    // 返回训练数据
    res.json({
      trainingType,
      trainingName: trainingConfig.name,
      ...trainingData
    });

  } catch (error) {
    console.error('Error generating training:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({ 
        msg: 'DeepSeek API调用失败: ' + (error.response.data?.error?.message || error.message) 
      });
    }
    
    res.status(500).json({ msg: '生成训练题目失败: ' + error.message });
  }
};

// 提交答案并评分
exports.submitAnswers = async (req, res) => {
  try {
    const { trainingType, questions, answers, completed } = req.body;

    if (!trainingType || !questions || !answers) {
      return res.status(400).json({ msg: '缺少必要参数' });
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      return res.status(500).json({ msg: 'DeepSeek API Key未配置' });
    }

    const normalizeAnswerArray = (value) => {
      if (Array.isArray(value)) {
        return [...value].map(Number).filter(v => !Number.isNaN(v)).sort((a, b) => a - b);
      }
      if (value === null || value === undefined) return [];
      const num = Number(value);
      return Number.isNaN(num) ? [] : [num];
    };

    const isMultipleQuestion = (question) => {
      if (!question) return false;
      if (question.selectionType === 'multiple' || question.allowMultiple === true) return true;
      return Array.isArray(question.correctAnswers) && question.correctAnswers.length > 1;
    };

    // 计算正确率
    let correctCount = 0;
    const answeredQuestionsCount = questions.reduce((count, question, index) => {
      const normalized = normalizeAnswerArray(answers[index]);
      return normalized.length > 0 ? count + 1 : count;
    }, 0);

    const results = questions.map((q, index) => {
      const multiple = isMultipleQuestion(q);
      const expectedAnswers = multiple
        ? normalizeAnswerArray(q.correctAnswers)
        : normalizeAnswerArray(q.correctAnswer);
      const userAnswer = answers[index];
      const userAnswersNormalized = normalizeAnswerArray(userAnswer);

      let isCorrect = false;
      if (multiple) {
        isCorrect = expectedAnswers.length > 0 &&
          expectedAnswers.length === userAnswersNormalized.length &&
          expectedAnswers.every((val, idx) => val === userAnswersNormalized[idx]);
      } else {
        isCorrect = userAnswersNormalized.length === 1 && expectedAnswers[0] === userAnswersNormalized[0];
      }

      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        question: q.question,
        options: q.options,
        selectionType: multiple ? 'multiple' : 'single',
        userAnswer,
        correctAnswer: q.correctAnswer,
        correctAnswers: q.correctAnswers,
        isCorrect,
        hint: q.hint
      };
    });

    const accuracy = (correctCount / questions.length) * 100;
    const isCompleted = completed !== false; // 默认为true，除非明确设置为false

    // 生成评价和鼓励
    let prompt = '';
    if (isCompleted) {
      prompt = `一位阿尔茨海默症患者完成了${TRAINING_TYPES[trainingType].name}，结果如下：
- 总题数：${questions.length}
- 正确数：${correctCount}
- 正确率：${accuracy.toFixed(1)}%

请生成一份温和、鼓励性的评价报告，要求：
1. 先给出总体评价（积极、鼓励）
2. 分析表现（不要过于严格，要温和）
3. 给出鼓励性建议
4. 语言要温和、支持，避免挫败感

请按照以下JSON格式返回：
{
  "score": ${Math.round(accuracy)},
  "overallComment": "总体评价（1-2句话，鼓励性）",
  "detailedAnalysis": "详细分析（3-5句话，温和、支持）",
  "encouragement": "鼓励性建议（2-3句话）",
  "nextSteps": "下一步建议（1-2句话）"
}
只返回JSON格式，不要包含其他文字说明。`;
    } else {
      prompt = `一位阿尔茨海默症患者中途退出了${TRAINING_TYPES[trainingType].name}，已完成情况：
- 总题数：${questions.length}
- 已完成：${answeredQuestionsCount}
- 正确数：${correctCount}
- 正确率：${answeredQuestionsCount > 0 ? (correctCount / answeredQuestionsCount * 100).toFixed(1) : 0}%

请生成一份温和、鼓励性的评价，要求：
1. 不要批评中途退出，要理解和支持
2. 肯定已完成的部分
3. 给予鼓励，建议休息后再继续
4. 语言要温和、支持，避免挫败感

请按照以下JSON格式返回：
{
  "score": ${answeredQuestionsCount > 0 ? Math.round(correctCount / answeredQuestionsCount * 100) : 0},
  "overallComment": "总体评价（1-2句话，鼓励性，不要批评退出）",
  "detailedAnalysis": "详细分析（3-5句话，温和、支持，肯定已完成部分）",
  "encouragement": "鼓励性建议（2-3句话，建议休息）",
  "nextSteps": "下一步建议（1-2句话，鼓励继续）"
}
只返回JSON格式，不要包含其他文字说明。`;
    }

    // 调用DeepSeek API生成评价
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${deepseekApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 解析AI返回的内容
    const aiResponse = response.data.choices[0].message.content.trim();
    
    // 尝试提取JSON
    let jsonStr = aiResponse;
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    let evaluation;
    try {
      evaluation = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      // 如果解析失败，使用默认评价
      evaluation = {
        score: Math.round(accuracy),
        overallComment: isCompleted 
          ? '您完成了训练，这很棒！' 
          : '您已经开始了训练，这很好！',
        detailedAnalysis: isCompleted
          ? `您完成了${questions.length}道题目，正确了${correctCount}道。继续努力！`
          : `您已经完成了${answers.length}道题目，表现不错。休息一下再继续吧！`,
        encouragement: '请继续保持，每天坚持训练会有很好的效果。',
        nextSteps: '建议明天继续训练，逐步提高难度。'
      };
    }

    // 返回结果
    res.json({
      trainingType,
      trainingName: TRAINING_TYPES[trainingType].name,
      completed: isCompleted,
      totalQuestions: questions.length,
      answeredQuestions: answeredQuestionsCount,
      correctCount,
      accuracy: accuracy.toFixed(1),
      results,
      evaluation
    });

  } catch (error) {
    console.error('Error submitting answers:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({ 
        msg: 'DeepSeek API调用失败: ' + (error.response.data?.error?.message || error.message) 
      });
    }
    
    res.status(500).json({ msg: '提交答案失败: ' + error.message });
  }
};

// 获取训练类型信息
exports.getTrainingTypes = async (req, res) => {
  try {
    const types = Object.keys(TRAINING_TYPES).map(key => ({
      id: key,
      ...TRAINING_TYPES[key]
    }));
    
    res.json({ types });
  } catch (error) {
    console.error('Error getting training types:', error.message);
    res.status(500).json({ msg: '获取训练类型失败: ' + error.message });
  }
};

