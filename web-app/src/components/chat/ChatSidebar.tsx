import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChatTeardropDots,
  MagnifyingGlass,
  SidebarSimple,
  NotePencil,
  Phone,
  VideoCamera,
  ArrowLeft,
  PaperPlaneRight,
  X,
  Spinner,
  Users,
} from '@phosphor-icons/react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import keycloak from '../../keycloak';
import type { SearchUserResult, SearchApiResponse } from '../../types/searchTypes';

export function ChatSidebar() {
  const {
    conversations,
    activeUserId,
    activeUser,
    totalUnread,
    filter,
    chatDisplayMode,
    isRightSidebarOpen,
    openChat,
    sendMessage,
    toggleChatLayoutMode,
    setFilter,
  } = useChat();

  const { token } = useAuth();
  const { info } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [embedInput, setEmbedInput] = useState('');
  const [showEmbeddedChat, setShowEmbeddedChat] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // If in embedded mode and user selects a conversation, show the embedded chat
  useEffect(() => {
    if (chatDisplayMode === 'embedded') {
      setShowEmbeddedChat(true);
    } else {
      setShowEmbeddedChat(false);
    }
  }, [chatDisplayMode, activeUserId]);

  useEffect(() => {
    if (showEmbeddedChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showEmbeddedChat, activeUser?.messages]);

  // Debounced search for system users
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const abortController = new AbortController();
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const currentToken = token || keycloak.token;
        const currentUserId = keycloak.subject || keycloak.tokenParsed?.sub;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (currentToken) {
          headers['Authorization'] = `Bearer ${currentToken}`;
        }

        let foundUsers: SearchUserResult[] = [];

        // 1. Primary: search service /search/users
        try {
          const params = new URLSearchParams({
            keyword: trimmed,
            page: '0',
            size: '8',
          });
          const res = await fetch(`/search/users?${params}`, {
            headers,
            signal: abortController.signal,
          });

          if (res.ok) {
            const data: SearchApiResponse<SearchUserResult> = await res.json();
            if (data.code === 1000 && data.result?.items) {
              foundUsers = data.result.items;
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          console.warn('Search service user search error, trying profile fallback:', err);
        }

        // 2. Fallback: if search service yielded no results or errored, try /profile/users
        if (foundUsers.length === 0 && !abortController.signal.aborted) {
          try {
            const profRes = await fetch('/profile/users', {
              headers,
              signal: abortController.signal,
            });
            if (profRes.ok) {
              const profData = await profRes.json();
              const list = Array.isArray(profData.result) ? profData.result : [];
              const lowerQ = trimmed.toLowerCase();
              foundUsers = list
                .filter((p: any) => {
                  const uName = (p.username || '').toLowerCase();
                  const fName = (p.firstName || '').toLowerCase();
                  const lName = (p.lastName || '').toLowerCase();
                  const email = (p.email || '').toLowerCase();
                  return (
                    uName.includes(lowerQ) ||
                    fName.includes(lowerQ) ||
                    lName.includes(lowerQ) ||
                    email.includes(lowerQ)
                  );
                })
                .slice(0, 8)
                .map((p: any) => ({
                  userId: p.userId,
                  profileId: p.profileId || '',
                  username: p.username || '',
                  firstName: p.firstName || '',
                  lastName: p.lastName || '',
                  email: p.email || '',
                  avatar: p.avatar || null,
                }));
            }
          } catch (err: any) {
            if (err.name === 'AbortError') return;
            console.warn('Profile fallback error:', err);
          }
        }

        if (!abortController.signal.aborted) {
          // Filter out the currently logged-in user
          const currentUsername = keycloak.tokenParsed?.preferred_username;
          const filtered = foundUsers.filter(
            (u) => u.userId !== currentUserId && (!currentUsername || u.username !== currentUsername)
          );
          setSearchResults(filtered);
          setIsSearching(false);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Chat search error:', err);
          setIsSearching(false);
        }
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [searchQuery, token]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    searchInputRef.current?.focus();
  }, []);

  const handleSelectUser = async (user: SearchUserResult) => {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
    const avatar =
      user.avatar ||
      `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(user.userId)}&size=80`;

    // Clear search bar
    setSearchQuery('');
    setSearchResults([]);

    try {
      await openChat(user.userId, {
        name: fullName,
        role: `@${user.username}`,
        avatar,
      });

      if (chatDisplayMode === 'embedded') {
        setShowEmbeddedChat(true);
      }
    } catch (err) {
      console.error('Error opening chat with user:', err);
    }
  };

  const handleOpenConversation = async (convId: string) => {
    await openChat(convId);
    if (chatDisplayMode === 'embedded') {
      setShowEmbeddedChat(true);
    }
  };

  if (!isRightSidebarOpen) return null;

  const usersList = Object.values(conversations);
  const onlineUsers = usersList.filter((u) => u.online);

  // Filter existing conversations matching search query
  const matchingConversations = usersList.filter((u) => {
    return (
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Filtered users for normal tab list
  const filteredUsers = usersList.filter((u) => {
    if (filter === 'unread') return u.unread > 0;
    if (filter === 'online') return u.online;
    return true;
  });

  const handleEmbedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!embedInput.trim()) return;
    sendMessage(embedInput);
    setEmbedInput('');
  };

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <aside
      id="right-chat-sidebar"
      className="w-full sm:w-[350px] lg:w-[360px] shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 h-[calc(100vh-4rem)] sticky top-16 flex flex-col transition-all duration-300 z-30 shadow-xs"
    >
      {/* 1. Header của Chat Service Sidebar */}
      <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] dark:bg-indigo-950 flex items-center justify-center text-[#4F46E5] dark:text-indigo-400">
              <ChatTeardropDots weight="fill" className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-[15.5px] text-slate-900 dark:text-white tracking-tight">
              Tin nhắn
            </h2>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#EEF2FF] dark:bg-indigo-950 text-[#4F46E5] dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                {totalUnread} mới
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Toggle Floating vs Embedded mode */}
            <button
              type="button"
              onClick={toggleChatLayoutMode}
              className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium bg-[#F8FAFC] dark:bg-slate-800 hover:bg-[#EEF2FF] dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-[#4F46E5] border border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Đổi kiểu mở khung chat: Cửa sổ nổi cạnh phải hoặc Gộp chung vào Sidebar"
            >
              <SidebarSimple weight="bold" className="w-3.5 h-3.5 text-[#4F46E5] dark:text-indigo-400" />
              <span>{chatDisplayMode === 'floating' ? 'Cửa sổ nổi' : 'Gộp vào cột'}</span>
            </button>

            {/* New Chat Button - focuses the search bar */}
            <button
              type="button"
              onClick={() => {
                searchInputRef.current?.focus();
                info('Nhập tên hoặc username để tìm người dùng và trò chuyện!');
              }}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
              title="Tìm người dùng để trò chuyện mới"
            >
              <NotePencil className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thanh tìm kiếm */}
        <div className="relative">
          <MagnifyingGlass className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm người dùng, tên tài khoản..."
            className="w-full pl-9 pr-9 py-2 text-[13px] bg-[#F8FAFC] dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 transition-all"
          />
          {isSearching ? (
            <Spinner className="w-3.5 h-3.5 animate-spin text-indigo-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          ) : isSearchActive ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="w-5 h-5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3 h-3" />
            </button>
          ) : null}
        </div>

        {/* Tabs lọc hoặc Breadcrumb kết quả tìm kiếm */}
        {isSearchActive ? (
          <div className="flex items-center justify-between mt-2.5 px-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
            <span className="truncate">
              Tìm: <strong className="text-slate-800 dark:text-slate-200 font-semibold">"{searchQuery}"</strong>
            </span>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-[#4F46E5] dark:text-indigo-400 hover:underline font-medium shrink-0 ml-2 cursor-pointer"
            >
              Đóng tìm kiếm
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-3">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#EEF2FF] dark:bg-indigo-950/90 text-[#4F46E5] dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                filter === 'unread'
                  ? 'bg-[#EEF2FF] dark:bg-indigo-950/90 text-[#4F46E5] dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Chưa đọc {totalUnread > 0 ? `(${totalUnread})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setFilter('online')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                filter === 'online'
                  ? 'bg-[#EEF2FF] dark:bg-indigo-950/90 text-[#4F46E5] dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>Online</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Danh sách Bạn bè đang hoạt động (Active Now Strip) - chỉ hiện khi không tìm kiếm */}
      {!isSearchActive && (
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-[#F8FAFC]/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Đang hoạt động ({onlineUsers.length})
            </span>
            <span className="font-mono text-[10.5px] text-[#10B981] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" /> Trực tuyến
            </span>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
            {onlineUsers.length === 0 ? (
              <p className="text-[11.5px] text-slate-400 py-1 italic">Không có người dùng trực tuyến</p>
            ) : (
              onlineUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleOpenConversation(user.id)}
                  className="flex flex-col items-center gap-1 group shrink-0 focus:outline-none cursor-pointer"
                >
                  <div
                    className={`relative p-0.5 rounded-full transition-all ${
                      activeUserId === user.id
                        ? 'ring-2 ring-[#4F46E5]'
                        : 'group-hover:ring-2 group-hover:ring-indigo-300'
                    }`}
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#10B981] ring-2 ring-white dark:ring-slate-900" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 group-hover:text-[#4F46E5] max-w-[58px] truncate">
                    {user.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. Danh sách cuộc trò chuyện HOẶC Kết quả tìm kiếm HOẶC Khung chat hợp nhất trong cột */}
      {showEmbeddedChat && activeUser ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          {/* Header embedded chat */}
          <div className="px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowEmbeddedChat(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Quay lại danh sách"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="relative">
                <img
                  src={activeUser.avatar}
                  alt={activeUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                    activeUser.online ? 'bg-[#10B981]' : 'bg-slate-400'
                  }`}
                />
              </div>
              <div>
                <h4 className="font-bold text-[13.5px] text-slate-900 dark:text-white leading-tight">
                  {activeUser.name}
                </h4>
                <p className={`text-[11px] font-medium ${activeUser.online ? 'text-[#10B981]' : 'text-slate-400'}`}>
                  {activeUser.online ? 'Đang hoạt động' : 'Ngoại tuyến'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => info('Đang gọi thoại cho ' + activeUser.name + '...')}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => info('Đang gọi video cho ' + activeUser.name + '...')}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <VideoCamera className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages list in embedded column */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#F8FAFC]/50 dark:bg-slate-950/40">
            <div className="text-center py-2 border-b border-slate-200/60 dark:border-slate-800/80 mb-2">
              <img
                src={activeUser.avatar}
                alt={activeUser.name}
                className="w-11 h-11 rounded-full object-cover mx-auto mb-1 ring-2 ring-indigo-500/20"
              />
              <p className="font-bold text-[13px] text-slate-800 dark:text-slate-100">{activeUser.name}</p>
              <p className="text-[11px] text-slate-400">{activeUser.role} • Kết nối trên GenV</p>
            </div>

            {activeUser.messages.map((msg) =>
              msg.sender === 'me' ? (
                <div key={msg.id} className="flex flex-col items-end">
                  <div className="max-w-[82%] px-3.5 py-2 rounded-2xl rounded-br-none bg-[#4F46E5] text-white text-[13px] leading-relaxed shadow-xs break-words">
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
                    className="w-6 h-6 rounded-full object-cover shrink-0 mb-3"
                  />
                  <div className="flex flex-col items-start max-w-[80%]">
                    <div className="px-3.5 py-2 rounded-2xl rounded-bl-none bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-[13px] leading-relaxed shadow-card break-words">
                      {msg.text}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 mt-1 ml-1">{msg.time}</span>
                  </div>
                </div>
              )
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input embedded */}
          <form onSubmit={handleEmbedSubmit} className="p-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-full px-3 py-1.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10">
              <input
                type="text"
                value={embedInput}
                onChange={(e) => setEmbedInput(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-transparent text-[13px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                autoComplete="off"
              />
              <button
                type="submit"
                className="w-7 h-7 rounded-full bg-[#4F46E5] hover:bg-indigo-600 text-white flex items-center justify-center transition-transform active:scale-95 shrink-0 cursor-pointer"
              >
                <PaperPlaneRight weight="fill" className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      ) : isSearchActive ? (
        /* ==================== SEARCH RESULTS VIEW ==================== */
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
          {isSearching && searchResults.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Spinner className="w-6 h-6 animate-spin text-[#4F46E5] dark:text-indigo-400" />
              <p className="text-[12.5px] font-medium">Đang tìm người dùng trên hệ thống...</p>
            </div>
          ) : searchResults.length === 0 && matchingConversations.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">
                Không tìm thấy người dùng
              </h4>
              <p className="text-[12px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                Không tìm thấy tài khoản nào khớp với "{searchQuery}". Hãy thử tìm theo tên đầy đủ hoặc username.
              </p>
            </div>
          ) : (
            <>
              {/* Section 1: Người dùng hệ thống (System Users) */}
              {searchResults.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Người dùng ({searchResults.length})
                    </span>
                    <span className="text-[10.5px] text-[#4F46E5] dark:text-indigo-400 font-medium">
                      Nhấn để nhắn tin
                    </span>
                  </div>

                  <div className="space-y-1">
                    {searchResults.map((user) => {
                      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
                      const avatarUrl =
                        user.avatar ||
                        `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(user.userId)}&size=80`;

                      return (
                        <div
                          key={user.userId}
                          onClick={() => handleSelectUser(user)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[#EEF2FF]/80 dark:hover:bg-indigo-950/50 border border-transparent hover:border-indigo-200/70 dark:hover:border-indigo-800/60 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={avatarUrl}
                                alt={user.username}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200/80 dark:border-slate-700 group-hover:ring-2 group-hover:ring-[#4F46E5]/40 transition-all"
                              />
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#10B981] ring-2 ring-white dark:ring-slate-900" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[13px] font-bold text-slate-900 dark:text-white truncate group-hover:text-[#4F46E5] dark:group-hover:text-indigo-400 transition-colors">
                                {fullName}
                              </h4>
                              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate font-mono">
                                @{user.username}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 pl-2">
                            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#EEF2FF] dark:bg-indigo-950 text-[#4F46E5] dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1 group-hover:bg-[#4F46E5] group-hover:text-white transition-colors">
                              <ChatTeardropDots weight="bold" className="w-3.5 h-3.5" />
                              <span>Nhắn tin</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 2: Cuộc trò chuyện khớp (Matching conversations) */}
              {matchingConversations.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Đoạn chat hiện có ({matchingConversations.length})
                    </span>
                  </div>

                  <div className="space-y-1">
                    {matchingConversations.map((user) => {
                      const lastMsg = user.messages && user.messages.length > 0 ? user.messages[user.messages.length - 1] : null;
                      const lastText = lastMsg
                        ? lastMsg.sender === 'me'
                          ? `Bạn: ${lastMsg.text}`
                          : lastMsg.text
                        : user.lastMessage || 'Bắt đầu trò chuyện';

                      return (
                        <div
                          key={user.id}
                          onClick={() => handleOpenConversation(user.id)}
                          className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/70 border border-transparent transition-all"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200/80 dark:border-slate-700"
                            />
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                                user.online ? 'bg-[#10B981]' : 'bg-slate-300 dark:bg-slate-600'
                              }`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {user.name}
                              </h4>
                              <span className="font-mono text-[10.5px] text-slate-400 shrink-0">
                                {user.lastTime}
                              </span>
                            </div>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {lastText}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ==================== NORMAL CONVERSATION LIST ==================== */
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80 dark:divide-slate-800/60 px-2 py-1.5">
          {filteredUsers.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-[13px] text-slate-400">Không tìm thấy cuộc trò chuyện nào phù hợp.</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const lastMsg = user.messages && user.messages.length > 0 ? user.messages[user.messages.length - 1] : null;
              const lastText = lastMsg
                ? lastMsg.sender === 'me'
                  ? `Bạn: ${lastMsg.text}`
                  : lastMsg.text
                : user.lastMessage || 'Bắt đầu trò chuyện';
              const isSelected = activeUserId === user.id;

              return (
                <div
                  key={user.id}
                  onClick={() => handleOpenConversation(user.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#EEF2FF]/90 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/60'
                      : 'hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200/80 dark:border-slate-700"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                        user.online ? 'bg-[#10B981]' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-[13.5px] truncate ${
                          user.unread > 0
                            ? 'font-bold text-slate-900 dark:text-white'
                            : 'font-semibold text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {user.name}
                      </h4>
                      <span
                        className={`font-mono text-[11px] shrink-0 ${
                          user.unread > 0
                            ? 'text-[#4F46E5] dark:text-indigo-400 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        {user.lastTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p
                        className={`text-[12.5px] truncate ${
                          user.unread > 0
                            ? 'font-semibold text-slate-800 dark:text-slate-100'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {lastText}
                      </p>
                      {user.unread > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#4F46E5] text-white text-[10.5px] font-bold flex items-center justify-center shrink-0">
                          {user.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. Footer WebSocket Status */}
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/90 flex items-center justify-between text-[11.5px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="font-medium text-slate-700 dark:text-slate-300">GenV Chat Service</span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">ws://localhost:8099</span>
      </div>
    </aside>
  );
}

