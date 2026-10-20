export interface ChatMessage {
  id: string;
  conversationId?: string;
  sender: 'me' | 'them';
  senderId?: string;
  senderName?: string;
  text: string;
  time: string;
}

export interface ChatConversation {
  id: string;
  name: string;
  role: string;
  avatar: string;
  online: boolean;
  unread: number;
  lastTime: string;
  lastMessage?: string;
  targetUserId?: string;
  messages: ChatMessage[];
}

export type ChatFilter = 'all' | 'unread' | 'online';
export type ChatLayoutMode = 'floating' | 'embedded';
