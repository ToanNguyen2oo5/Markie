import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import keycloak from '../keycloak';
import type { ChatConversation, ChatMessage, ChatFilter, ChatLayoutMode } from '../types/chatTypes';

const CHAT_REST_BASE = 'http://localhost:8086/chat';
const CHAT_SOCKET_URL = 'http://localhost:8099';

export interface ChatMetadata {
  name?: string;
  role?: string;
  avatar?: string;
}

interface ChatContextType {
  conversations: Record<string, ChatConversation>;
  activeUserId: string;
  activeUser: ChatConversation | undefined;
  totalUnread: number;
  filter: ChatFilter;
  chatDisplayMode: ChatLayoutMode;
  isFloatingOpen: boolean;
  isFloatingMinimized: boolean;
  isRightSidebarOpen: boolean;
  typingUser: string | null;
  openChat: (userId: string, metadata?: ChatMetadata) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  sendQuickReply: (text: string) => void;
  emitTyping: (isTyping: boolean) => void;
  toggleRightSidebar: () => void;
  toggleChatLayoutMode: () => void;
  toggleMinimizeFloatingChat: () => void;
  closeFloatingChat: () => void;
  closeEmbeddedChat: () => void;
  setFilter: (f: ChatFilter) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, token } = useAuth();
  const { info } = useToast();
  const [conversations, setConversations] = useState<Record<string, ChatConversation>>({});
  const [activeUserId, setActiveUserId] = useState<string>('');
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [chatDisplayMode, setChatDisplayMode] = useState<ChatLayoutMode>('floating');
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [isFloatingMinimized, setIsFloatingMinimized] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const activeUserIdRef = useRef<string>('');
  const conversationsRef = useRef<Record<string, ChatConversation>>({});
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const activeUser = conversations[activeUserId];

  const totalUnread = useMemo(() => {
    return Object.values(conversations).reduce((acc, curr) => acc + (curr.unread || 0), 0);
  }, [conversations]);

  const playChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // ignore audio errors
    }
  }, []);

  // 1. Fetch conversations from Spring Boot REST API
  const fetchMyConversations = useCallback(async () => {
    const currentToken = token || keycloak.token;
    if (!currentToken) return;

    try {
      const res = await fetch(`${CHAT_REST_BASE}/conversations/my-conversations`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        const currentUserId = keycloak.subject || keycloak.tokenParsed?.sub;

        setConversations((prev) => {
          const updated: Record<string, ChatConversation> = { ...prev };
          for (const c of data.result) {
            const existing = prev[c.id];
            const partner = c.participants?.find((p: any) => p.userId !== currentUserId);
            const partnerDisplayName = partner
              ? partner.firstName
                ? `${partner.firstName} ${partner.lastName || ''}`.trim()
                : partner.username
              : c.conversationName || 'Cuộc trò chuyện';

            updated[c.id] = {
              id: c.id,
              name: c.conversationName || partnerDisplayName,
              role: c.type === 'GROUP' ? 'Nhóm' : 'Trực tiếp',
              avatar:
                c.conversationAvatar ||
                partner?.avatar ||
                `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(c.id)}&size=80`,
              online: true,
              unread: existing ? existing.unread : 0,
              lastTime: c.lastMessageTime ? formatTime(c.lastMessageTime) : (existing?.lastTime || ''),
              lastMessage: c.lastMessage || (existing?.lastMessage || ''),
              targetUserId: partner?.userId || existing?.targetUserId,
              messages: existing && existing.messages.length > 0 ? existing.messages : [],
            };

            // Join socket room for this conversation
            if (socketRef.current?.connected && c.id) {
              socketRef.current.emit('join_conversation', c.id);
            }
          }
          return updated;
        });
      }
    } catch (err) {
      console.warn('Cannot fetch conversations from chat-service:', err);
    }
  }, [token]);

  // 2. Fetch message history for a conversation
  const fetchMessages = useCallback(
    async (convId: string) => {
      const currentToken = token || keycloak.token;
      if (!currentToken || !convId) return;

      try {
        const res = await fetch(
          `${CHAT_REST_BASE}/messages?conversationId=${encodeURIComponent(convId)}`,
          {
            headers: { Authorization: `Bearer ${currentToken}` },
          }
        );
        if (!res.ok) return;

        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          const currentUserId = keycloak.subject || keycloak.tokenParsed?.sub;
          const mappedMsgs: ChatMessage[] = data.result.map((m: any) => ({
            id: m.id || String(Date.now()),
            conversationId: m.conversationId,
            sender: (m.sender && m.sender.userId === currentUserId) || m.me ? 'me' : 'them',
            senderId: m.sender?.userId,
            senderName: m.sender?.firstName
              ? `${m.sender.firstName} ${m.sender.lastName || ''}`.trim()
              : m.sender?.username,
            text: m.message,
            time: formatTime(m.createdDate),
          }));

          setConversations((prev) => {
            const currentConv = prev[convId];
            if (!currentConv) return prev;

            // Merge server messages with any optimistic messages not yet acknowledged
            const serverIds = new Set(mappedMsgs.map((m) => m.id));
            const pendingNewer = currentConv.messages.filter(
              (m) => !serverIds.has(m.id) && m.conversationId === convId
            );

            return {
              ...prev,
              [convId]: {
                ...currentConv,
                messages: [...mappedMsgs, ...pendingNewer],
                unread: 0,
              },
            };
          });
        }
      } catch (err) {
        console.warn('Cannot fetch messages for conversation:', convId, err);
      }
    },
    [token]
  );

  // 3. Connect to Netty-SocketIO on port 8099
  useEffect(() => {
    const currentToken = token || keycloak.token;
    if (!authenticated || !currentToken) return;

    fetchMyConversations();

    const socket = io(CHAT_SOCKET_URL, {
      query: { token: currentToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ [Socket.IO] Connected to Chat Service (8099):', socket.id);
      // Join active conversation room if set
      if (activeUserIdRef.current) {
        socket.emit('join_conversation', activeUserIdRef.current);
      }
      // Join all user conversation rooms
      Object.keys(conversationsRef.current).forEach((convId) => {
        socket.emit('join_conversation', convId);
      });
    });

    socket.on('connect_error', (err: any) => {
      console.warn('⚠️ [Socket.IO] Connection error:', err.message);
    });

    socket.on('disconnect', (reason: string) => {
      console.log('ℹ️ [Socket.IO] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, reconnect manually
        socket.connect();
      }
    });

    socket.on('receive_message', (msg: any) => {
      console.log('📥 [Socket.IO] Received receive_message:', msg);
      const currentUserId = keycloak.subject || keycloak.tokenParsed?.sub;
      const isMe = msg.sender?.userId
        ? msg.sender.userId === currentUserId
        : Boolean(msg.me);
      const convId = msg.conversationId;
      if (!convId) return;

      const senderDisplayName = msg.sender?.firstName
        ? `${msg.sender.firstName} ${msg.sender.lastName || ''}`.trim()
        : msg.sender?.username || 'Đối phương';

      const newMsg: ChatMessage = {
        id: msg.id || String(Date.now()),
        conversationId: convId,
        sender: isMe ? 'me' : 'them',
        senderId: msg.sender?.userId,
        senderName: senderDisplayName,
        text: msg.message,
        time: formatTime(msg.createdDate || new Date().toISOString()),
      };

      // Ensure room is joined on socket
      if (socketRef.current?.connected) {
        socketRef.current.emit('join_conversation', convId);
      }

      setConversations((prev) => {
        const conv = prev[convId];
        const isCurrentActive = activeUserIdRef.current === convId;

        // If conversation is not in local state yet, create entry immediately
        if (!conv) {
          const partnerAvatar =
            msg.sender?.avatar ||
            `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(msg.sender?.userId || convId)}&size=80`;

          return {
            ...prev,
            [convId]: {
              id: convId,
              name: senderDisplayName,
              role: 'Trực tiếp',
              avatar: partnerAvatar,
              online: true,
              unread: isCurrentActive || isMe ? 0 : 1,
              lastTime: newMsg.time,
              lastMessage: msg.message,
              targetUserId: msg.sender?.userId,
              messages: [newMsg],
            },
          };
        }

        // Deduplication & Replace optimistic message
        let foundExisting = false;
        const updatedMessages = conv.messages.map((m) => {
          if (m.id === newMsg.id) {
            foundExisting = true;
            return newMsg;
          }
          // If this is the optimistic message we sent earlier
          if (
            isMe &&
            m.sender === 'me' &&
            m.text === newMsg.text &&
            m.id.length > 10 &&
            !isNaN(Number(m.id))
          ) {
            foundExisting = true;
            return newMsg;
          }
          return m;
        });

        if (!foundExisting) {
          updatedMessages.push(newMsg);
        }

        return {
          ...prev,
          [convId]: {
            ...conv,
            lastMessage: msg.message,
            lastTime: newMsg.time,
            unread: isCurrentActive || isMe ? 0 : (conv.unread || 0) + 1,
            messages: updatedMessages,
          },
        };
      });

      // Sound & notification feedback for incoming messages
      if (!isMe) {
        playChime();
        if (activeUserIdRef.current !== convId) {
          info(`${senderDisplayName}: ${msg.message}`, 'Tin nhắn mới');
        }
      }
    });

    socket.on('new_message_notification', (msg: any) => {
      console.log('🔔 [Socket.IO] Received new_message_notification:', msg);
      fetchMyConversations();
    });

    socket.on('user_typing', (data: any) => {
      const currentUserId = keycloak.subject || keycloak.tokenParsed?.sub;
      if (data.conversationId === activeUserIdRef.current && data.userId !== currentUserId) {
        setTypingUser(data.isTyping ? 'Đối phương' : null);
      }
    });

    socket.on('error', (err: any) => {
      console.warn('⚠️ [Socket.IO] Error event:', err);
    });

    return () => {
      socket.disconnect();
    };
  }, [authenticated, token, fetchMyConversations, playChime, info]);


  // 4. Open chat with a user (create or get conversation from backend)
  const openChat = async (targetUserId: string, metadata?: ChatMetadata) => {
    if (!targetUserId) return;
    const currentToken = token || keycloak.token;

    let targetConvId = '';

    // A. Check if we already have a conversation with this targetUserId
    const existingEntry = Object.values(conversations).find(
      (c) => c.id === targetUserId || c.targetUserId === targetUserId
    );

    if (existingEntry) {
      targetConvId = existingEntry.id;
      if (metadata && (existingEntry.name === targetUserId || !existingEntry.avatar || existingEntry.avatar.includes('dicebear'))) {
        setConversations((prev) => ({
          ...prev,
          [existingEntry.id]: {
            ...prev[existingEntry.id],
            name: metadata.name || prev[existingEntry.id]?.name,
            avatar: metadata.avatar || prev[existingEntry.id]?.avatar,
            role: metadata.role || prev[existingEntry.id]?.role,
          },
        }));
      }
    } else if (currentToken) {
      // B. Call backend POST /chat/conversations/create to get or create real conversation in MongoDB
      try {
        const res = await fetch(`${CHAT_REST_BASE}/conversations/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            type: 'DIRECT',
            participantIds: [targetUserId],
            conversationName: metadata?.name,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.code === 1000 && data.result) {
            const conv = data.result;
            targetConvId = conv.id;

            setConversations((prev) => ({
              ...prev,
              [conv.id]: {
                id: conv.id,
                name: conv.conversationName || metadata?.name || targetUserId,
                role: metadata?.role || 'Trực tiếp',
                avatar:
                  conv.conversationAvatar ||
                  metadata?.avatar ||
                  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(targetUserId)}&size=80`,
                online: true,
                unread: 0,
                lastTime: conv.lastMessageTime ? formatTime(conv.lastMessageTime) : 'Mới bắt đầu',
                lastMessage: conv.lastMessage || '',
                targetUserId: targetUserId,
                messages: prev[conv.id]?.messages || [],
              },
            }));
          }
        }
      } catch (err) {
        console.warn('Failed to create backend conversation:', err);
      }
    }

    // Fallback if backend returned no id
    if (!targetConvId) {
      targetConvId = targetUserId;
      setConversations((prev) => ({
        ...prev,
        [targetConvId]: prev[targetConvId] || {
          id: targetConvId,
          name: metadata?.name || targetUserId,
          role: metadata?.role || 'Trực tiếp',
          avatar:
            metadata?.avatar ||
            `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(targetUserId)}&size=80`,
          online: true,
          unread: 0,
          lastTime: 'Vừa xong',
          lastMessage: '',
          targetUserId: targetUserId,
          messages: [],
        },
      }));
    }

    // Join room on socket (retain all previous rooms for continuous real-time delivery)
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join_conversation', targetConvId);
    }

    setActiveUserId(targetConvId);
    setIsFloatingOpen(true);
    setIsFloatingMinimized(false);

    // Fetch message history for this conversation
    await fetchMessages(targetConvId);
  };

  // 5. Send message via Netty-SocketIO & fallback REST
  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !activeUserId) return;

    const convId = activeUserId;
    const currentToken = token || keycloak.token;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const tempId = String(Date.now());

    // Optimistic UI update
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: convId,
      sender: 'me',
      text: trimmed,
      time: timeStr,
    };

    setConversations((prev) => {
      const conv = prev[convId];
      if (!conv) return prev;
      return {
        ...prev,
        [convId]: {
          ...conv,
          lastMessage: trimmed,
          lastTime: 'Vừa xong',
          messages: [...conv.messages, optimisticMsg],
        },
      };
    });

    // Clear typing indicator
    emitTyping(false);

    const payload = {
      conversationId: convId,
      message: trimmed,
    };

    // A. Emit via Netty-SocketIO (port 8099)
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('send_message', payload);
    } else if (currentToken) {
      // B. Fallback REST API
      try {
        await fetch(`${CHAT_REST_BASE}/messages/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('Failed to send message via REST fallback:', err);
      }
    }
  };

  const emitTyping = (isTyping: boolean) => {
    if (!activeUserId || !socketRef.current || !socketRef.current.connected) return;

    socketRef.current.emit('typing', {
      conversationId: activeUserId,
      isTyping,
    });

    if (isTyping) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        if (socketRef.current && socketRef.current.connected && activeUserIdRef.current) {
          socketRef.current.emit('typing', {
            conversationId: activeUserIdRef.current,
            isTyping: false,
          });
        }
      }, 2500);
    }
  };

  const sendQuickReply = (text: string) => {
    sendMessage(text);
  };

  const toggleRightSidebar = () => {
    setIsRightSidebarOpen((prev) => !prev);
  };

  const toggleChatLayoutMode = () => {
    setChatDisplayMode((prev) => (prev === 'floating' ? 'embedded' : 'floating'));
    if (chatDisplayMode === 'embedded') {
      setIsFloatingOpen(true);
      setIsFloatingMinimized(false);
    }
  };

  const toggleMinimizeFloatingChat = () => {
    setIsFloatingMinimized((prev) => !prev);
  };

  const closeFloatingChat = () => {
    setIsFloatingOpen(false);
  };

  const closeEmbeddedChat = () => {
    // Return to list view in embedded mode
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeUserId,
        activeUser,
        totalUnread,
        filter,
        chatDisplayMode,
        isFloatingOpen,
        isFloatingMinimized,
        isRightSidebarOpen,
        typingUser,
        openChat,
        sendMessage,
        sendQuickReply,
        emitTyping,
        toggleRightSidebar,
        toggleChatLayoutMode,
        toggleMinimizeFloatingChat,
        closeFloatingChat,
        closeEmbeddedChat,
        setFilter,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
