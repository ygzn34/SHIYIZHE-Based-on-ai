// src/pages/AIChatPage.jsx
import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/axios';

const initialAssistantMessage = {
  role: 'assistant',
  content:
    '你好呀，我是你的温暖陪伴者。慢慢说，我会耐心地听着你，并帮你把珍贵的记忆一点点找回来。',
};

function AIChatPage() {
  const [messages, setMessages] = useState([initialAssistantMessage]);
  const [relatedMemories, setRelatedMemories] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInputValue('');
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/memories/ai-chat', {
        message: trimmed,
        conversation: nextMessages.slice(-6),
      });

      const assistantReply = {
        role: 'assistant',
        content: response.data?.reply || '我会一直在这里陪着你～',
      };

      setMessages((prev) => [...prev, assistantReply]);
      setRelatedMemories(response.data?.relatedMemories || []);
    } catch (err) {
      console.error('AI对话失败: ', err);
      setError(err.response?.data?.msg || 'AI暂时没有回应，我们稍后再试试好吗？');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 bg-gradient-to-br from-rose-50 via-amber-50 to-blue-50">
      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[2fr,1fr]">
        <section className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl shadow-rose-300/20 border border-white/40 p-6 flex flex-col">
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 bg-clip-text text-transparent">
              AI温情对话
            </h1>
            <p className="text-gray-600 mt-2 text-sm leading-relaxed">
              我会带着你收藏的记忆，慢慢地和你聊天。无论你想聊生活、家人还是儿时的故事，都可以告诉我。
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow ${
                    message.role === 'assistant'
                      ? 'bg-gradient-to-r from-rose-50 to-orange-50 text-gray-700 border border-rose-100'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-indigo-400/40'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="mt-4 rounded-2xl bg-red-50 text-red-700 px-4 py-3 border border-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="可以慢慢写下此刻的心情，也可以告诉我想记起哪一段时光。"
              className="w-full min-h-[120px] px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-rose-300 focus:border-rose-400 outline-none resize-none bg-white/90"
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading}
              className="self-end px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 text-white font-semibold shadow-lg shadow-rose-400/40 hover:shadow-xl hover:shadow-orange-300/40 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'AI 正在温柔思考…' : '发送'}
            </button>
          </div>
        </section>

        <aside className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-xl border border-white/40 p-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">记忆提醒</h2>
            <p className="text-gray-500 text-sm mt-1">
              当你分享感受时，我会尝试唤醒和你有关的记忆。也可以点开这些记忆，再去翻看完整内容。
            </p>
          </div>

          {relatedMemories.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-white/70 border border-dashed border-gray-300 p-6 text-center text-gray-500">
              还没有匹配到记忆。多聊聊，我们就能一起找到更多线索。
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {relatedMemories.map((memory) => (
                <div
                  key={memory.id}
                  className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 shadow-sm"
                >
                  <p className="font-semibold text-amber-900 mb-1">{memory.title}</p>
                  <p className="text-xs text-amber-600 mb-2">{memory.date}</p>
                  <p className="text-sm text-amber-800 whitespace-pre-wrap">
                    {memory.excerpt || '这段记忆正等待被重新讲述。'}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-purple-50/80 border border-purple-100 px-4 py-3 text-sm text-purple-700">
            · 说话可以慢一点，如果忘记了也没关系。<br />
            · 我会把你提到的温暖细节记下来，随时再提醒你。
          </div>
        </aside>
      </div>
    </div>
  );
}

export default AIChatPage;


