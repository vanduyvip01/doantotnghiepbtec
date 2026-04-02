import { create } from 'zustand';
import io, { Socket } from 'socket.io-client';
import { api } from '../api/client';

export interface Attachment {
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  url: string;
  name: string;
  size: number;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
}

export interface ReplyTo {
  messageId: string;
  senderId: string;
  senderName: string;
  text: string;
}

export interface ForwardedFrom {
  messageId: string;
  senderId: string;
  senderName: string;
  channelId?: string;
  receiverId?: string;
}

export interface ReadBy {
  userId: string;
  readAt: string;
}

export interface Message {
  _id?: string;
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  attachments?: Attachment[];
  replyTo?: ReplyTo | null;
  forwardedFrom?: ForwardedFrom | null;
  readBy?: ReadBy[];
  reactions?: Array<{ emoji: string; users: string[] }>;
  createdAt: string;
  isDeleted?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  members?: string[];
  isPrivate?: boolean;
}

export interface DirectMessage extends Message {
  receiverId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface ChatStore {
  // Socket connection
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  
  // Chat data
  channels: Channel[];
  availableChannels: Channel[]; // ← Channels user hasn't joined
  activeChannel: string | null;
  messages: { [channelId: string]: Message[] };
  directMessages: { [userId: string]: Message[] };
  typingUsers: string[];
  allUsers: User[];
  
  // Actions
  connectSocket: (userId: string, userName: string) => void;
  disconnectSocket: () => void;
  
  fetchChannels: () => Promise<void>;
  fetchAvailableChannels: () => Promise<void>; // ← New
  selectChannel: (channelId: string) => Promise<void>;
  createChannel: (name: string, description?: string) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  sendMessage: (channelId: string, text: string, attachments?: Attachment[]) => void;
  
  sendDirectMessage: (receiverId: string, text: string, attachments?: Attachment[]) => void;
  fetchDirectMessages: (userId: string) => Promise<void>;
  
  uploadFile: (channelId: string | null, receiverId: string | null, file: File, senderName: string, isChannel: boolean) => Promise<Attachment | undefined>;
  
  sendReply: (replyToId: string, text: string, isChannel: boolean, channelId?: string, receiverId?: string) => void;
  sendForward: (messageId: string, toChannelId?: string, toReceiverId?: string, text?: string) => void;
  addReaction: (messageId: string, emoji: string, channelId?: string, receiverId?: string) => void;
  markAsRead: (messageId: string, channelId?: string) => void;
  deleteMessage: (messageId: string, channelId?: string) => Promise<void>;
  editMessage: (messageId: string, newText: string, channelId?: string) => Promise<void>;
  
  // Channel member management
  fetchAllUsers: () => Promise<void>;
  addUserToChannel: (channelId: string, userId: string) => Promise<void>;
  removeUserFromChannel: (channelId: string, userId: string) => Promise<void>;
  joinChannel: (channelId: string) => Promise<void>; // ← New
  
  addTypingUser: (userName: string) => void;
  removeTypingUser: (userName: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: [],
  channels: [],
  availableChannels: [],
  activeChannel: null,
  messages: {},
  directMessages: {},
  typingUsers: [],
  allUsers: [],
  
  connectSocket: (userId: string, userName: string) => {
    console.log('🔌 Creating WebSocket connection...');
    
    const socketURL = 'http://localhost:5000';
    console.log(`📡 Connecting to socket server at ${socketURL}`);
    
    const socket = io(socketURL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });
    
    // Set socket immediately (not after connect)
    set({ socket });
    console.log('✅ Socket object created and stored in state');
    
    socket.on('connect', () => {
      console.log('✅ Socket connected to server');
      socket.emit('user:join', { userId, userName });
      set({ isConnected: true });
    });
    
    socket.on('disconnect', () => {
      console.warn('⚠️ Socket disconnected from server');
      set({ isConnected: false });
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });
    
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
    
    socket.on('users:online', (userIds: string[]) => {
      set({ onlineUsers: userIds });
      console.log(`👥 Online users: ${userIds.length}`);
    });
    
    // Handle channel messages (with attachments, replyTo, etc)
    socket.on('message:receive', (message: Message) => {
      console.log('📨 message:receive event:', message);
      const { messages, activeChannel } = get();
      if (message && activeChannel) {
        console.log(`✅ Adding message to channel ${activeChannel}`);
        set({
          messages: {
            ...messages,
            [activeChannel]: [...(messages[activeChannel] || []), message]
          }
        });
      } else {
        console.warn('⚠️ message:receive - no message or activeChannel:', { message, activeChannel });
      }
    });
    
    // Handle DMs
    socket.on('dm:receive', (message: Message) => {
      const { directMessages } = get();
      const userId = message.senderId;
      console.log(`💌 dm:receive: Got message from ${userId}, storing in directMessages[${userId}]`);
      set({
        directMessages: {
          ...directMessages,
          [userId]: [...(directMessages[userId] || []), message]
        }
      });
    });
    
    socket.on('dm:sent', (message: Message) => {
      const { directMessages } = get();
      // For sent messages, receiverId should always be present
      const receiverId = (message as any).receiverId;
      if (!receiverId) {
        console.warn('⚠️ dm:sent message missing receiverId:', message);
        return;
      }
      
      console.log(`✅ dm:sent: Storing DM in directMessages[${receiverId}]`);
      set({
        directMessages: {
          ...directMessages,
          [receiverId]: [...(directMessages[receiverId] || []), message]
        }
      });
    });
    
    // Handle reactions
    socket.on('message:reaction:added', (data: any) => {
      const { messages, directMessages, activeChannel } = get();
      
      // Handle channel reactions
      if (activeChannel && messages[activeChannel]) {
        const updatedMessages = messages[activeChannel].map(msg => {
          if (msg.id === data.messageId || msg._id === data.messageId) {
            return {
              ...msg,
              reactions: msg.reactions?.map(r => 
                r.emoji === data.emoji ? { ...r, users: data.users } : r
              ) || [{ emoji: data.emoji, users: data.users }]
            };
          }
          return msg;
        });
        set({ messages: { ...messages, [activeChannel]: updatedMessages } });
      }
      
      // Handle DM reactions
      Object.keys(directMessages).forEach(userId => {
        const updated = directMessages[userId].map(msg => {
          if (msg.id === data.messageId || msg._id === data.messageId) {
            return {
              ...msg,
              reactions: msg.reactions?.map(r => 
                r.emoji === data.emoji ? { ...r, users: data.users } : r
              ) || [{ emoji: data.emoji, users: data.users }]
            };
          }
          return msg;
        });
        if (updated.some((msg, idx) => msg !== directMessages[userId][idx])) {
          set(state => ({
            directMessages: {
              ...state.directMessages,
              [userId]: updated
            }
          }));
        }
      });
    });
    
    // Handle read receipts
    socket.on('message:read:updated', (data: any) => {
      const { messages, activeChannel } = get();
      if (activeChannel && messages[activeChannel]) {
        const updatedMessages = messages[activeChannel].map(msg => {
          if (msg.id === data.messageId || msg._id === data.messageId) {
            return {
              ...msg,
              readBy: [...(msg.readBy || []), { userId: data.userId, readAt: data.readAt }]
            };
          }
          return msg;
        });
        set({ messages: { ...messages, [activeChannel]: updatedMessages } });
      }
    });
    
    socket.on('typing:indicator', (data: { userName: string; isTyping: boolean }) => {
      const { typingUsers } = get();
      if (data.isTyping) {
        if (!typingUsers.includes(data.userName)) {
          set({ typingUsers: [...typingUsers, data.userName] });
        }
      } else {
        set({ typingUsers: typingUsers.filter(u => u !== data.userName) });
      }
    });
    
    socket.on('error', (error: any) => {
      console.error('❌ WebSocket error:', error);
    });
    
    socket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket');
      set({ isConnected: false });
    });
  },
  
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
  
  fetchChannels: async () => {
    try {
      const response = await api.get('/chat/channels');
      let channels = Array.isArray(response) ? response : (response as any)?.data || [];
      
      // Ensure each channel has an id field
      channels = channels.map((ch: any) => ({
        ...ch,
        id: ch.id || ch._id
      }));
      
      set({ channels });
      console.log(`📌 Fetched ${channels.length} channels:`, channels.map((c: any) => ({ name: c.name, id: c.id })));
    } catch (err) {
      console.error('❌ Failed to fetch channels:', err);
      set({ channels: [] });
    }
  },

  fetchAvailableChannels: async () => {
    try {
      const response = await api.get('/chat/channels/available/all');
      let channels = Array.isArray(response) ? response : (response as any)?.data || [];
      
      // Ensure each channel has an id field
      channels = channels.map((ch: any) => ({
        ...ch,
        id: ch.id || ch._id
      }));
      
      set({ availableChannels: channels });
      console.log(`📢 Fetched ${channels.length} available channels to join`);
    } catch (err) {
      console.error('❌ Failed to fetch available channels:', err);
      set({ availableChannels: [] });
    }
  },
  
  selectChannel: async (channelId: string) => {
    try {
      if (!channelId || channelId === 'undefined') {
        console.error('❌ Invalid channelId:', channelId);
        return;
      }
      
      console.log(`🔄 Selecting channel: ${channelId}`);
      
      const { socket } = get();
      if (socket) {
        console.log('📍 Emitting channel:join');
        socket.emit('channel:join', { channelId });
      } else {
        console.warn('⚠️ Socket not ready when joining channel');
      }
      
      const response = await api.get(`/chat/channels/${channelId}/messages`);
      const channelMessages = Array.isArray(response) ? response : (response as any)?.data || [];
      
      set(state => ({
        activeChannel: channelId,
        messages: {
          ...state.messages,
          [channelId]: channelMessages
        }
      }));
      
      console.log(`✅ Loaded ${channelMessages.length} messages from channel ${channelId}`);
    } catch (err) {
      console.error('❌ Failed to select channel:', err);
    }
  },
  
  createChannel: async (name: string, description?: string) => {
    try {
      const response = await api.post('/chat/channels', { name, description });
      const newChannel = response;
      
      console.log('✅ Channel created with response:', newChannel);
      console.log('📌 Channel ID from response:', newChannel?.id || newChannel?._id);
      
      set(state => ({
        channels: [...state.channels, newChannel]
      }));
      
      console.log('✅ Channel added to state:', newChannel.name);
    } catch (err) {
      console.error('❌ Create channel failed:', err);
      throw err;
    }
  },
  
  deleteChannel: async (channelId: string) => {
    try {
      await api.delete(`/chat/channels/${channelId}`);
      
      set(state => ({
        channels: state.channels.filter(ch => ch.id !== channelId),
        activeChannel: state.activeChannel === channelId ? null : state.activeChannel,
        messages: (() => {
          const newMessages = { ...state.messages };
          delete newMessages[channelId];
          return newMessages;
        })()
      }));
      
      console.log('✅ Channel deleted');
    } catch (err) {
      console.error('❌ Delete channel failed:', err);
      throw err;
    }
  },
  
  sendMessage: (channelId: string, text: string, attachments?: Attachment[]) => {
    const { socket } = get();
    
    console.log('🔄 sendMessage called:', { channelId, text, hasSocket: !!socket });
    
    if (!socket) {
      console.error('❌ Socket not connected');
      return;
    }
    
    if (!text.trim()) {
      console.warn('⚠️ Empty message');
      return;
    }
    
    const payload = {
      channelId,
      text: text.trim(),
      attachments: attachments || [],
      senderId: localStorage.getItem('userId'),
    };
    
    console.log('📤 Emitting message:send:', payload);
    socket.emit('message:send', payload);
    console.log('✅ Message emitted to socket');
  },
  
  sendDirectMessage: (receiverId: string, text: string, attachments?: Attachment[]) => {
    const { socket } = get();
    if (!socket || !text.trim()) {
      console.warn('⚠️ Cannot send DM:', { socket: !!socket, text: text.trim() });
      return;
    }
    
    const senderId = localStorage.getItem('userId') || 'unknown';
    console.log(`📤 Sending DM: From ${senderId} to ${receiverId} - "${text.substring(0, 50)}..."`);
    
    socket.emit('dm:send', {
      receiverId,
      text: text.trim(),
      attachments: attachments || [],
      senderId,
    });
  },
  
  fetchDirectMessages: async (userId: string) => {
    try {
      console.log(`📥 Fetching DM history with user: ${userId}`);
      const response = await api.get(`/chat/dm/${userId}`);
      const messages = Array.isArray(response) ? response : (response as any)?.data || [];
      
      console.log(`✅ Loaded ${messages.length} previous DMs with user ${userId}`);
      set(state => ({
        directMessages: {
          ...state.directMessages,
          [userId]: messages
        }
      }));
    } catch (err) {
      console.error(`❌ Failed to fetch DMs with ${userId}:`, err);
      // Still set empty array to show conversation ready
      set(state => ({
        directMessages: {
          ...state.directMessages,
          [userId]: []
        }
      }));
    }
  },
  
  uploadFile: async (channelId: string | null, receiverId: string | null, file: File, senderName: string, isChannel: boolean): Promise<Attachment | undefined> => {
    const { socket, messages, directMessages, activeChannel } = get();
    if (!socket || !file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    if (channelId) formData.append('channelId', channelId);
    if (receiverId) formData.append('receiverId', receiverId);
    
    try {
      const response = await api.upload('/chat/upload', formData);
      
      const attachment = (response as any)?.attachment;
      
      if (attachment) {
        const senderId = localStorage.getItem('userId');
        const senderAvatar = localStorage.getItem('userAvatar') || '';
        
        // Create optimistic message (show immediately)
        const optimisticMessage = {
          _id: `temp_${Date.now()}`,
          id: `temp_${Date.now()}`,
          channelId: channelId || undefined,
          receiverId: receiverId || undefined,
          senderId,
          senderName,
          senderAvatar,
          text: `📎 ${attachment.name}`,
          attachments: [attachment],
          readBy: [{ userId: senderId, readAt: new Date() }],
          reactions: [],
          replyTo: null,
          createdAt: new Date(),
          isDeleted: false
        };
        
        // Add to store immediately
        if (isChannel && channelId) {
          set(state => ({
            messages: {
              ...state.messages,
              [channelId]: [...(state.messages[channelId] || []), optimisticMessage]
            }
          }));
        } else if (receiverId) {
          set(state => ({
            directMessages: {
              ...state.directMessages,
              [receiverId]: [...(state.directMessages[receiverId] || []), optimisticMessage]
            }
          }));
        }
        
        // Emit socket event to save to DB
        socket.emit('file:upload', {
          channelId,
          receiverId,
          attachment,
          senderId,
          messageType: isChannel ? 'channel' : 'dm'
        });
        
        console.log(`📁 File uploaded: ${file.name}`);
        return attachment;
      }
    } catch (err) {
      console.error('❌ File upload failed:', err);
    }
  },
  
  sendReply: (replyToId: string, text: string, isChannel: boolean, channelId?: string, receiverId?: string) => {
    const { socket } = get();
    if (!socket || !text.trim()) return;
    
    socket.emit('message:reply', {
      replyToId,
      channelId: isChannel ? channelId : undefined,
      receiverId: !isChannel ? receiverId : undefined,
      text: text.trim(),
      senderId: localStorage.getItem('userId'),
      senderName: localStorage.getItem('userName') || 'Unknown',
      senderAvatar: localStorage.getItem('userAvatar') || ''
    });
  },
  
  sendForward: (messageId: string, toChannelId?: string, toReceiverId?: string, text?: string) => {
    const { socket } = get();
    if (!socket) return;
    
    socket.emit('message:forward', {
      messageId,
      forwardToChannelId: toChannelId,
      forwardToReceiverId: toReceiverId,
      text: text?.trim(),
      senderId: localStorage.getItem('userId'),
      senderName: localStorage.getItem('userName') || 'Unknown',
      senderAvatar: localStorage.getItem('userAvatar') || ''
    });
  },
  
  addReaction: (messageId: string, emoji: string, channelId?: string, receiverId?: string) => {
    const { socket } = get();
    if (!socket) return;
    
    socket.emit('message:reaction:add', {
      messageId,
      emoji,
      channelId,
      receiverId,
      userId: localStorage.getItem('userId')
    });
  },
  
  markAsRead: (messageId: string, channelId?: string) => {
    const { socket } = get();
    if (!socket) return;
    
    socket.emit('message:read', {
      messageId,
      channelId,
      userId: localStorage.getItem('userId')
    });
  },
  
  deleteMessage: async (messageId: string, channelId?: string) => {
    try {
      await api.delete(`/chat/messages/${messageId}`);
      
      // Update store - mark as deleted
      const { messages, directMessages } = get();
      
      if (channelId) {
        set(state => ({
          messages: {
            ...state.messages,
            [channelId]: state.messages[channelId].map(msg => 
              msg._id === messageId || msg.id === messageId 
                ? { ...msg, isDeleted: true, text: '[Đã xóa]' }
                : msg
            )
          }
        }));
      } else {
        // Find which DM it belongs to
        Object.keys(directMessages).forEach(userId => {
          set(state => ({
            directMessages: {
              ...state.directMessages,
              [userId]: state.directMessages[userId].map(msg =>
                msg._id === messageId || msg.id === messageId
                  ? { ...msg, isDeleted: true, text: '[Đã xóa]' }
                  : msg
              )
            }
          }));
        });
      }
    } catch (err) {
      console.error('❌ Delete failed:', err);
    }
  },
  
  editMessage: async (messageId: string, newText: string, channelId?: string) => {
    try {
      await api.patch(`/chat/messages/${messageId}`, { text: newText });
      
      // Update store
      const { messages, directMessages } = get();
      
      if (channelId) {
        set(state => ({
          messages: {
            ...state.messages,
            [channelId]: state.messages[channelId].map(msg =>
              msg._id === messageId || msg.id === messageId
                ? { ...msg, text: newText }
                : msg
            )
          }
        }));
      } else {
        // Find which DM it belongs to
        Object.keys(directMessages).forEach(userId => {
          set(state => ({
            directMessages: {
              ...state.directMessages,
              [userId]: state.directMessages[userId].map(msg =>
                msg._id === messageId || msg.id === messageId
                  ? { ...msg, text: newText }
                  : msg
              )
            }
          }));
        });
      }
    } catch (err) {
      console.error('❌ Edit failed:', err);
    }
  },
  
  addTypingUser: (userName: string) => {
    const { socket, activeChannel } = get();
    if (socket && activeChannel) {
      socket.emit('typing:start', { channelId: activeChannel, userName });
    }
  },
  
  removeTypingUser: (userName: string) => {
    const { socket, activeChannel } = get();
    if (socket && activeChannel) {
      socket.emit('typing:stop', { channelId: activeChannel, userName });
    }
  },
  
  fetchAllUsers: async () => {
    try {
      // For admin: fetch with admin endpoint, for others: fetch regular endpoint
      const userRole = localStorage.getItem('userRole');
      const endpoint = userRole === 'ADMIN' 
        ? '/chat/users/admin/all' 
        : '/chat/users/all';
      console.log(`📥 [AllUsers] Fetching from ${endpoint} (role: ${userRole})`);
      const response = await api.get(endpoint);
      const users = Array.isArray(response) ? response : (response as any)?.data || [];
      
      console.log(`✅ [AllUsers] Fetched ${users.length} users`);
      if (users.length > 0) {
        console.log(`👥 [AllUsers] Sample users:`, users.slice(0, 3).map(u => ({ id: u.id, name: u.name })));
      }
      
      set({ allUsers: users });
    } catch (err) {
      console.error('❌ [AllUsers] Failed to fetch:', err);
    }
  },
  
  addUserToChannel: async (channelId: string, userId: string) => {
    try {
      console.log(`📤 API: PUT /chat/channels/${channelId}/members - Add User ${userId}`);
      const response = await api.put(`/chat/channels/${channelId}/members`, {
        action: 'add',
        userId
      });
      console.log('API Response:', response);
      
      // Update channels list
      set(state => ({
        channels: state.channels.map(ch => 
          ch.id === channelId 
            ? { ...ch, members: [...(ch.members || []), userId] }
            : ch
        )
      }));
      
      console.log(`✅ User ${userId} added to channel ${channelId}`);
    } catch (err) {
      console.error('❌ Failed to add user to channel:', err);
      throw err;
    }
  },
  
  removeUserFromChannel: async (channelId: string, userId: string) => {
    try {
      console.log(`📤 API: PUT /chat/channels/${channelId}/members - Remove User ${userId}`);
      const response = await api.put(`/chat/channels/${channelId}/members`, {
        action: 'remove',
        userId
      });
      console.log('API Response:', response);
      
      // Update channels list
      set(state => ({
        channels: state.channels.map(ch => 
          ch.id === channelId 
            ? { ...ch, members: (ch.members || []).filter(id => id !== userId) }
            : ch
        )
      }));
      
      console.log(`✅ User ${userId} removed from channel ${channelId}`);
    } catch (err) {
      console.error('❌ Failed to remove user from channel:', err);
      throw err;
    }
  },

  joinChannel: async (channelId: string) => {
    try {
      const response = await api.post<any>(`/chat/channels/${channelId}/join`, {});
      
      // Move channel from availableChannels to channels
      set(state => ({
        channels: [...state.channels, response.channel || response],
        availableChannels: state.availableChannels.filter(ch => ch.id !== channelId)
      }));
      
      console.log(`✅ Joined channel ${channelId}`);
    } catch (err) {
      console.error('❌ Failed to join channel:', err);
      throw err;
    }
  }
}));
