import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  VideoCamera,
  Minus,
  X,
  Image as ImageIcon,
  Smiley,
  PaperPlaneRight,
} from '@phosphor-icons/react';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';

export function FloatingChatWindow() {
  const {
    activeUser,
    isFloatingOpen,
    isFloatingMinimized,
    chatDisplayMode,
    isRightSidebarOpen,
    typingUser,
    sendMessage,
    sendQuickReply,
    emitTyping,
    toggleMinimizeFloatingChat,
    closeFloatingChat,
  } = useChat();

  const { info } = useToast();
  const [inputText, setInputText] = useState('');
  const [hasSidebarInDom, setHasSidebarInDom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkSidebar = () => {
      const sidebar = document.getElementById('right-chat-sidebar');
      setHasSidebarInDom(Boolean(sidebar && !sidebar.classList.contains('hidden')));
    };
    checkSidebar();
    const interval = setInterval(checkSidebar, 800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isFloatingMinimized && isFloatingOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeUser?.messages, isFloatingMinimized, isFloatingOpen, typingUser]);

  if (!isFloatingOpen || chatDisplayMode !== 'floating' || !activeUser) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
  };

  const insertEmoji = () => {
    const emojis = ['✨', '🚀', '💜', '👍', '😄', '🎉', '🔥', '☕'];
    const pick = emojis[Math.floor(Math.random() * emojis.length)];
    setInputText((prev) => prev + pick);
  };

  const positionClass = hasSidebarInDom && isRightSidebarOpen
    ? 'right-4 sm:right-[376px]'
    : 'right-4 sm:right-6';

  return (
    <div
      id="floating-chat-window"
      className={`fixed bottom-0 z-50 w-[calc(100vw-2rem)] sm:w-[348px] bg-white dark:bg-slate-900 rounded-t-2xl border border-b-0 border-slate-200/95 dark:border-slate-700/90 shadow-floating flex flex-col transition-all duration-200 ${positionClass}`}
      style={{ height: isFloatingMinimized ? '56px' : '455px' }}
    >
      {/* Header Cửa sổ Chat */}
      <div
        className="px-4 py-3 bg-white dark:bg-slate-900 rounded-t-2xl border-b border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer select-none"
        onClick={toggleMinimizeFloatingChat}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src={activeUser.avatar}
              alt={activeUser.name}
              className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                activeUser.online ? 'bg-[#10B981]' : 'bg-slate-400'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-[14px] text-slate-900 dark:text-white leading-tight">
                {activeUser.name}
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EEF2FF] dark:bg-indigo-950 text-[#4F46E5] dark:text-indigo-400">
                {activeUser.role}
              </span>
            </div>
            <p
              className={`text-[11.5px] font-medium flex items-center gap-1 ${
                activeUser.online ? 'text-[#10B981]' : 'text-slate-400'
              }`}
            >
              <span>{activeUser.online ? 'Đang hoạt động' : `Hoạt động ${activeUser.lastTime} trước`}</span>
            </p>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => info(`Đang gọi thoại cho ${activeUser.name}...`)}
            className="w-7 h-7 rounded-lg hover:bg-[#EEF2FF] dark:hover:bg-slate-800 text-slate-500 hover:text-[#4F46E5] dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
            title="Gọi thoại"
          >
            <Phone className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => info(`Đang gọi video cho ${activeUser.name}...`)}
            className="w-7 h-7 rounded-lg hover:bg-[#EEF2FF] dark:hover:bg-slate-800 text-slate-500 hover:text-[#4F46E5] dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
            title="Gọi Video"
          >
            <VideoCamera className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleMinimizeFloatingChat}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
            title={isFloatingMinimized ? 'Phóng to' : 'Thu nhỏ'}
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={closeFloatingChat}
            className="w-7 h-7 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng cửa sổ chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isFloatingMinimized && (
        <>
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]/70 dark:bg-slate-950/50">
            <div className="text-center py-3 border-b border-slate-200/60 dark:border-slate-800/80 mb-2">
              <img
                src={activeUser.avatar}
                alt={activeUser.name}
                className="w-12 h-12 rounded-full object-cover mx-auto mb-1.5 ring-2 ring-indigo-500/20"
              />
              <p className="font-bold text-[13.5px] text-slate-800 dark:text-slate-100">
                {activeUser.name}
              </p>
              <p className="text-[11.5px] text-slate-400">
                {activeUser.role} • Kết nối trên GenV
              </p>
            </div>

            {activeUser.messages.map((msg) =>
              msg.sender === 'me' ? (
                <div key={msg.id} className="flex flex-col items-end">
                  <div className="max-w-[82%] px-3.5 py-2 rounded-2xl rounded-br-none bg-[#4F46E5] text-white text-[13.5px] leading-relaxed shadow-xs break-words">
                    {msg.text}
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    {msg.time} • Đã xem
                  </span>
                </div>
              ) : (
                <div key={msg.id} className="flex items-end gap-2">
                  <img
                    src={activeUser.avatar}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover shrink-0 mb-4"
                  />
                  <div className="flex flex-col items-start max-w-[80%]">
                    <div className="px-3.5 py-2 rounded-2xl rounded-bl-none bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-[13.5px] leading-relaxed shadow-card break-words">
                      {msg.text}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 mt-1 ml-1">{msg.time}</span>
                  </div>
                </div>
              )
            )}

            {/* Typing Indicator */}
            {typingUser && (
              <div className="flex items-center gap-2 pt-1 text-[11.5px] text-slate-400">
                <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 px-2.5 py-1.5 rounded-2xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 typing-dot" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 typing-dot" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 typing-dot" />
                </div>
                <span className="font-mono text-[11px]">{typingUser} đang soạn tin...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies Bar */}
          <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => sendQuickReply('Chào bạn nhé! 👋')}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-[#F8FAFC] dark:bg-slate-800 hover:bg-[#EEF2FF] dark:hover:bg-indigo-950/80 text-slate-600 dark:text-slate-300 hover:text-[#4F46E5] border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
            >
              👋 Chào bạn nhé!
            </button>
            <button
              type="button"
              onClick={() => sendQuickReply('Bài viết #6ad5f4e0 hay quá!')}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-[#F8FAFC] dark:bg-slate-800 hover:bg-[#EEF2FF] dark:hover:bg-indigo-950/80 text-slate-600 dark:text-slate-300 hover:text-[#4F46E5] border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
            >
              ✨ Bài viết hay quá
            </button>
            <button
              type="button"
              onClick={() => sendQuickReply('Ok chốt vậy nha 👍')}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-[#F8FAFC] dark:bg-slate-800 hover:bg-[#EEF2FF] dark:hover:bg-indigo-950/80 text-slate-600 dark:text-slate-300 hover:text-[#4F46E5] border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
            >
              👍 Ok chốt nha
            </button>
          </div>

          {/* Form Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => info('Tính năng đính kèm hình ảnh đã sẵn sàng')}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#4F46E5] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="Đính kèm ảnh"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={insertEmoji}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#4F46E5] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="Chèn biểu cảm"
              >
                <Smiley className="w-4 h-4" />
              </button>

              <div className="flex-1 flex items-center bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-full pl-3.5 pr-1.5 py-1 focus-within:border-indigo-400 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    emitTyping(true);
                  }}
                  placeholder="Nhập tin nhắn..."
                  className="w-full bg-transparent text-[13.5px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="w-7 h-7 rounded-full bg-[#4F46E5] hover:bg-indigo-600 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 shrink-0 ml-1 cursor-pointer"
                  title="Gửi tin nhắn"
                >
                  <PaperPlaneRight weight="fill" className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
