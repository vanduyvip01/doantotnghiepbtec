import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Search, MessageSquare, X, Edit2, Trash2, Download, Smile, Share2, Plus, Users } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { useChatStore } from '../store/useChatStore';
import { Button } from '../components/Button';
import { cn } from '../utils/cn';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '✨', '👏'];

export const ChatPage = () => {
  const { user } = useAuthStore();
  const { employees } = useAppStore();
  const { 
    socket, 
    isConnected, 
    channels,
    availableChannels,
    activeChannel, 
    messages, 
    directMessages, 
    onlineUsers,
    allUsers,
    connectSocket, 
    disconnectSocket, 
    fetchChannels,
    fetchAvailableChannels,
    selectChannel, 
    createChannel,
    deleteChannel,
    sendMessage, 
    fetchDirectMessages, 
    sendDirectMessage,
    uploadFile,
    deleteMessage,
    editMessage,
    addReaction,
    sendForward,
    fetchAllUsers,
    addUserToChannel,
    removeUserFromChannel,
    joinChannel
  } = useChatStore();

  const [messageText, setMessageText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedDM, setSelectedDM] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showEmojiPickerId, setShowEmojiPickerId] = useState<string | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<string | null>(null);
  const [forwardTarget, setForwardTarget] = useState<{ type: 'channel' | 'dm'; id: string } | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [selectedMemberUsers, setSelectedMemberUsers] = useState<Set<string>>(new Set());
  const [showBrowseChannels, setShowBrowseChannels] = useState(false);
  const [joiningChannelId, setJoiningChannelId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize WebSocket and auto-select first channel
  useEffect(() => {
    console.log('🔍 ChatPage init:', { userId: user?.id, userName: user?.name, isConnected });
    
    if (user?.id && user?.name && !isConnected) {
      console.log('✅ Starting WebSocket connection and fetching channels...');
      connectSocket(user.id, user.name);
      fetchChannels();
      fetchAvailableChannels();
      
      // Fetch all users for DM and member management
      fetchAllUsers();
      
      // Store user info for later use
      localStorage.setItem('userId', user.id);
      localStorage.setItem('userName', user.name);
      localStorage.setItem('userAvatar', user.avatar || '');
      localStorage.setItem('userRole', user.role || 'USER');
    } else {
      console.log('⏭️  Skipping init:', { reason: user?.id ? 'already connected' : 'no user' });
    }

    return () => {
      // Optionally disconnect on unmount
      // disconnectSocket();
    };
  }, [user, isConnected, connectSocket, fetchChannels, fetchAvailableChannels, fetchAllUsers]);

  // Auto-select first channel when channels load
  useEffect(() => {
    if (channels.length > 0 && !activeChannel && !selectedDM) {
      console.log(`🎯 Auto-selecting first channel: ${channels[0].name} (${channels[0].id})`);
      selectChannel(channels[0].id);
    }
  }, [channels, activeChannel, selectedDM, selectChannel]);

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel, selectedDM]);

  const handleSendMessage = async () => {
    if (!messageText.trim() && !selectedFile) return;

    try {
      let attachments = [];
      
      // Upload file first if selected
      if (selectedFile) {
        console.log('📁 Uploading file:', selectedFile.name);
        const isChannelMessage = !selectedDM && !!activeChannel;
        const attachment = await uploadFile(
          isChannelMessage ? activeChannel : null,  // Only pass channelId if DM mode OFF
          !isChannelMessage ? selectedDM : null,     // Only pass receiverId if DM mode ON
          selectedFile, 
          user?.name || 'Unknown', 
          isChannelMessage  // True only if in channel mode
        );
        if (attachment) {
          attachments.push(attachment);
        }
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
      
      // Send message with attachments
      if (messageText.trim()) {
        if (activeChannel && !selectedDM) {
          sendMessage(activeChannel, messageText, attachments);
        } else if (selectedDM) {
          sendDirectMessage(selectedDM, messageText, attachments);
        }
      }

      setMessageText('');
    } catch (err) {
      console.error('❌ Send failed:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Just save the file to state, don't upload yet
    setSelectedFile(file);
    setShowFileUpload(false);
    console.log(`✅ File selected (not uploaded yet): ${file.name}`);
  };

  const loadDirectMessages = async (userId: string) => {
    console.log(`💬 [DM] Loading DM with user: ${userId}`);
    const targetUser = allUsers.find(u => u.id === userId) || employees.find(e => e.id === userId);
    console.log(`👤 Target user: ${targetUser?.name || 'Unknown'}`);
    
    setSelectedDM(userId);
    
    // Fetch the DM messages from backend
    try {
      await fetchDirectMessages(userId);
      console.log(`✅ [DM] Messages loaded for user: ${userId}`);
    } catch (err) {
      console.error(`❌ [DM] Failed to load messages:`, err);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (confirm('Bạn chắc chắn muốn xóa tin nhắn này?')) {
      deleteMessage(messageId, activeChannel);
    }
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!newText.trim()) return;
    await editMessage(messageId, newText, activeChannel);
    setEditingId(null);
    setEditText('');
  };

  const handleDownloadFile = (url: string, filename: string) => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (selectedDM) {
      // DM mode
      addReaction(messageId, emoji, undefined, selectedDM);
    } else if (activeChannel) {
      // Channel mode
      addReaction(messageId, emoji, activeChannel, undefined);
    }
    setShowEmojiPickerId(null);
  };

  const handleForwardMessage = (messageId: string) => {
    setForwardingMessage(messageId);
    setForwardTarget(null);
  };

  const completeForward = (msg: any) => {
    if (!forwardTarget) return;
    
    const isToChannel = forwardTarget.type === 'channel';
    
    // Only call sendForward - it handles everything including creating the forwarded message
    sendForward(msg._id || msg.id, isToChannel ? forwardTarget.id : undefined, !isToChannel ? forwardTarget.id : undefined);
    
    setForwardingMessage(null);
    setForwardTarget(null);
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      await createChannel(newChannelName, newChannelDesc);
      setShowCreateChannel(false);
      setNewChannelName('');
      setNewChannelDesc('');
    } catch (err) {
      alert('Lỗi tạo kênh: ' + (err as any).message);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    console.log('🗑 Attempting to delete channel:', channelId);
    if (!channelId) {
      alert('Channel ID không hợp lệ');
      return;
    }
    if (confirm('Bạn chắc chắn muốn xóa kênh này?')) {
      try {
        await deleteChannel(channelId);
        setDeletingChannelId(null);
      } catch (err) {
        alert('Lỗi xóa kênh: ' + (err as any).message);
      }
    }
  };

  const handleOpenManageMembers = () => {
    if (!activeChannel) return;
    
    const currentChannel = channels.find(c => c.id === activeChannel);
    if (currentChannel) {
      console.log('📋 Opening member dialog for channel:', {
        channelId: currentChannel.id,
        channelName: currentChannel.name,
        currentMembers: currentChannel.members,
        memberCount: currentChannel.members?.length || 0,
        availableUsers: allUsers.length
      });
      // Initialize selected members from current channel
      setSelectedMemberUsers(new Set(currentChannel.members || []));
      setShowMemberDialog(true);
    }
  };

  const handleToggleMember = (userId: string) => {
    const newSet = new Set(selectedMemberUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedMemberUsers(newSet);
  };

  const handleSaveMembers = async () => {
    if (!activeChannel) return;
    
    try {
      const currentChannel = channels.find(c => c.id === activeChannel);
      const currentMembers = new Set(currentChannel?.members || []);
      
      console.log('💾 Saving channel members:', {
        channel: currentChannel?.name,
        beforeMembers: Array.from(currentMembers) as string[],
        selectedMembers: Array.from(selectedMemberUsers) as string[],
        toAdd: (Array.from(selectedMemberUsers) as string[]).filter(id => !currentMembers.has(id)),
        toRemove: (Array.from(currentMembers) as string[]).filter(id => !selectedMemberUsers.has(id))
      });
      
      // Find users to add
      for (const userId of selectedMemberUsers) {
        if (!currentMembers.has(userId)) {
          console.log(`➕ Adding user ${userId} to channel`);
          await addUserToChannel(activeChannel, userId);
        }
      }
      
      // Find users to remove
      for (const userId of currentMembers) {
        if (!selectedMemberUsers.has(userId)) {
          console.log(`➖ Removing user ${userId} from channel`);
          await removeUserFromChannel(activeChannel, userId);
        }
      }
      
      // Refresh channels to get updated member list from server
      await fetchChannels();
      
      setShowMemberDialog(false);
      alert('Cập nhật thành viên kênh thành công!');
    } catch (err) {
      console.error('❌ Save members error:', err);
      alert('Lỗi cập nhật thành viên: ' + (err as any).message);
    }
  };

  const handleJoinChannel = async (channelId: string) => {
    try {
      setJoiningChannelId(channelId);
      await joinChannel(channelId);
      setJoiningChannelId(null);
      alert('Bạn đã tham gia kênh thành công!');
      // Refresh to show in channels list
      setTimeout(() => {
        fetchChannels();
        fetchAvailableChannels();
      }, 500);
    } catch (err) {
      setJoiningChannelId(null);
      alert('Lỗi tham gia kênh: ' + (err as any).message);
    }
  };

  const currentMessages = activeChannel && !selectedDM 
    ? messages[activeChannel] || [] 
    : directMessages[selectedDM || ''] || [];

  // Use allUsers to find DM target (not just employees table)
  const usersForDM = allUsers.length > 0 ? allUsers : employees;
  const currentChat = selectedDM 
    ? usersForDM.find(e => e.id === selectedDM)
    : channels.find(c => c.id === activeChannel);

  const chatstatus = selectedDM 
    ? onlineUsers.includes(selectedDM) ? '🟢 Online' : '⚪ Offline'
    : '📌 Channel';

  // Debug logging for DM state
  if (selectedDM && currentChat) {
    console.log('📊 DM State:', {
      selectedDM,
      currentChat: currentChat.name,
      messagesCount: currentMessages.length,
      usersForDMCount: usersForDM.length,
      allUsersCount: allUsers.length
    });
  }

  const filteredChannels = channels.filter(c => {
    console.log('📋 Channel in list:', { id: c.id, name: c.name });
    return c.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Use allUsers from chat store instead of employees for better coverage
  const filteredEmployees = usersForDM.filter(e => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chat</h1>
          <p className="text-slate-500">
            {isConnected ? '🟢 Connected' : '⚪ Connecting...'} • 
            {onlineUsers.length} online
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-12rem)] flex">
        {/* Sidebar */}
        <div className="w-72 border-r border-slate-100 flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Channels */}
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Channels</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowBrowseChannels(true)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                    title="Browse more channels"
                  >
                    <Search className="w-4 h-4 text-slate-400" />
                  </button>
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => setShowCreateChannel(true)}
                      className="p-1 hover:bg-slate-200 rounded transition-colors"
                      title="Create channel"
                    >
                      <Plus className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {filteredChannels.length === 0 ? (
                  <p className="text-sm text-slate-500">No channels found</p>
                ) : (
                  filteredChannels.map(channel => (
                    <div
                      key={channel.id}
                      className="flex items-center gap-2 group"
                    >
                      <button
                        onClick={() => {
                          selectChannel(channel.id);
                          setSelectedDM(null);
                        }}
                        className={cn(
                          'flex-1 flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-left',
                          activeChannel === channel.id && !selectedDM
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'hover:bg-slate-50 text-slate-600'
                        )}
                      >
                        <MessageSquare className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{channel.name}</span>
                      </button>
                      {user?.role === 'ADMIN' && (
                        <button
                          onClick={() => handleDeleteChannel(channel.id)}
                          className="p-1.5 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete channel"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Direct Messages */}
            <div className="px-4 py-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Direct Messages</p>
              <div className="space-y-2">
                {filteredEmployees.length === 0 ? (
                  <p className="text-sm text-slate-500">No people found</p>
                ) : (
                  filteredEmployees.map(employee => (
                    <button
                      key={employee.id}
                      onClick={() => loadDirectMessages(employee.id)}
                      className={cn(
                        'w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left',
                        selectedDM === employee.id
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'hover:bg-slate-50 text-slate-600'
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <img 
                          src={employee.avatar || `https://i.pravatar.cc/150?u=${employee.email}`} 
                          alt={employee.name} 
                          className="w-8 h-8 rounded-full"
                        />
                        {onlineUsers.includes(employee.id) && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{employee.name}</p>
                        <p className="text-xs text-slate-400">
                          {onlineUsers.includes(employee.id) ? '🟢 Online' : '⚪ Offline'}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {currentChat ? (
            <>
              {/* Header */}
              <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {selectedDM ? (
                    <img 
                      src={(currentChat as any)?.avatar || `https://i.pravatar.cc/150?u=${(currentChat as any)?.email}`} 
                      alt={currentChat?.name} 
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{currentChat.name}</h2>
                    <p className="text-xs text-slate-500">{chatstatus}</p>
                  </div>
                </div>
                
                {/* Admin actions */}
                {user?.role === 'ADMIN' && !selectedDM && (
                  <button
                    onClick={handleOpenManageMembers}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Manage channel members"
                  >
                    <Users className="w-5 h-5 text-slate-600" />
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {currentMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-500">No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  currentMessages.map((msg: any) => (
                    <div 
                      key={msg._id || msg.id} 
                      className={cn(
                        'flex gap-3 group',
                        msg.senderId === user?.id ? 'flex-row-reverse' : ''
                      )}
                    >
                      <img 
                        src={msg.senderAvatar || `https://i.pravatar.cc/150?u=${msg.senderId}`} 
                        alt="" 
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      />
                      <div className={cn(
                        'flex flex-col gap-1',
                        msg.senderId === user?.id ? 'items-end' : 'items-start'
                      )}>
                        <p className="text-xs text-slate-500">{msg.senderName} · {new Date(msg.createdAt).toLocaleTimeString()}</p>
                        
                        {/* Edit form */}
                        {editingId === (msg._id || msg.id) ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              className="px-3 py-1 bg-white border border-slate-300 rounded text-sm"
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditMessage(msg._id || msg.id, editText)}
                              className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 bg-slate-400 text-white rounded text-xs hover:bg-slate-500"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Message + Action Bar Row */}
                            <div className="flex items-start gap-2" style={{flexDirection: msg.senderId === user?.id ? 'row-reverse' : 'row'}}>
                              {/* Message bubble */}
                              <div className={cn(
                                'px-4 py-2 rounded-lg max-w-md space-y-2',
                                msg.senderId === user?.id
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-900'
                              )}>
                                {msg.text && (
                                  <p className="text-sm break-words">{msg.text}</p>
                                )}
                                
                                {/* Attachments v2 (array) */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="space-y-3">
                                    {msg.attachments.map((att: any, idx: number) => (
                                      <div key={idx}>
                                        {/* IMAGE PREVIEW */}
                                        {att.type === 'IMAGE' && (
                                          <div className="rounded overflow-hidden max-w-xs">
                                            <img 
                                              src={att.url} 
                                              alt={att.name}
                                              className="w-full h-auto rounded cursor-pointer hover:opacity-90"
                                              onClick={() => window.open(att.url, '_blank')}
                                            />
                                            <div className="flex items-center justify-between mt-1 text-xs opacity-75">
                                              <span className="truncate">{att.name}</span>
                                              <button
                                                onClick={() => handleDownloadFile(att.url, att.name)}
                                                className="flex items-center gap-1 ml-2 hover:opacity-100 text-indigo-600"
                                                title="Download"
                                              >
                                                <Download className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* VIDEO PREVIEW */}
                                        {att.type === 'VIDEO' && (
                                          <div className="rounded overflow-hidden max-w-xs">
                                            <video 
                                              src={att.url}
                                              className="w-full h-auto rounded"
                                              controls
                                            />
                                            <div className="flex items-center justify-between mt-1 text-xs opacity-75">
                                              <span className="truncate">{att.name}</span>
                                              <button
                                                onClick={() => handleDownloadFile(att.url, att.name)}
                                                className="flex items-center gap-1 ml-2 hover:opacity-100 text-indigo-600"
                                                title="Download"
                                              >
                                                <Download className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* AUDIO / DOCUMENT - Link with download */}
                                        {(att.type === 'AUDIO' || att.type === 'DOCUMENT') && (
                                          <div className="flex items-center gap-2">
                                            <a
                                              href={att.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={cn(
                                                'flex items-center gap-2 px-3 py-2 rounded text-sm hover:opacity-80 transition-opacity flex-1',
                                                msg.senderId === user?.id
                                                  ? 'bg-indigo-500 hover:bg-indigo-600'
                                                  : 'bg-slate-200 hover:bg-slate-300'
                                              )}
                                            >
                                              {att.type === 'AUDIO' && '🎤'}
                                              {att.type === 'DOCUMENT' && '📄'}
                                              <span className="truncate text-xs">{att.name}</span>
                                            </a>
                                            <button
                                              onClick={() => handleDownloadFile(att.url, att.name)}
                                              className={cn(
                                                'p-2 rounded hover:opacity-80 transition-opacity',
                                                msg.senderId === user?.id
                                                  ? 'hover:bg-indigo-500'
                                                  : 'hover:bg-slate-200'
                                              )}
                                              title="Download"
                                            >
                                              <Download className="w-4 h-4" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Action Bar - Compact horizontal */}
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity items-start pt-0.5">
                                {/* React button */}
                                <div className="relative">
                                  <button
                                    onClick={() => setShowEmojiPickerId(
                                      showEmojiPickerId === (msg._id || msg.id) ? null : (msg._id || msg.id)
                                    )}
                                    className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                                    title="Add reaction"
                                  >
                                    <Smile className="w-4 h-4 text-slate-600" />
                                  </button>
                                  
                                  {/* Emoji picker dropdown */}
                                  {showEmojiPickerId === (msg._id || msg.id) && (
                                    <div className="absolute top-8 left-0 bg-white border border-slate-200 rounded-lg shadow-lg p-2 flex gap-1 z-10 flex-wrap w-40">
                                      {EMOJI_REACTIONS.map(emoji => (
                                        <button
                                          key={emoji}
                                          onClick={() => handleAddReaction(msg._id || msg.id, emoji)}
                                          className="text-lg hover:bg-slate-100 rounded p-1 transition-colors"
                                          title={emoji}
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Forward button */}
                                <button
                                  onClick={() => handleForwardMessage(msg._id || msg.id)}
                                  className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                                  title="Forward"
                                >
                                  <Share2 className="w-4 h-4 text-slate-600" />
                                </button>

                                {/* Edit button - only own messages */}
                                {msg.senderId === user?.id && !msg.isDeleted && (
                                  <button
                                    onClick={() => {
                                      setEditingId(msg._id || msg.id);
                                      setEditText(msg.text);
                                    }}
                                    className="p-1.5 hover:bg-amber-100 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4 text-amber-600" />
                                  </button>
                                )}

                                {/* Delete button - only own messages */}
                                {msg.senderId === user?.id && !msg.isDeleted && (
                                  <button
                                    onClick={() => handleDeleteMessage(msg._id || msg.id)}
                                    className="p-1.5 hover:bg-red-100 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Existing reactions display */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className="flex gap-1 flex-wrap mt-1">
                                {msg.reactions.map((reaction: any, idx: number) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleAddReaction(msg._id || msg.id, reaction.emoji)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs transition-colors"
                                    title={`Reactions by: ${reaction.users.length === 1 ? 'you' : reaction.users.length + ' people'}`}
                                  >
                                    <span>{reaction.emoji}</span>
                                    <span className="text-slate-600">{reaction.users.length}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Reply indicator */}
                            {msg.replyTo && (
                              <div className="text-xs text-slate-500 italic px-2 border-l-2 border-slate-300">
                                ↳ Replying to {msg.replyTo.senderName}
                              </div>
                            )}
                        </>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-6 border-t border-slate-100 space-y-3">
                {showFileUpload && (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <input 
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="flex-1 text-sm"
                    />
                    <button 
                      onClick={() => {
                        setShowFileUpload(false);
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {selectedFile && (
                  <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <Paperclip className="w-4 h-4 text-indigo-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-indigo-900">{selectedFile.name}</p>
                      <p className="text-xs text-indigo-600">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 hover:bg-indigo-200 rounded"
                    >
                      <X className="w-4 h-4 text-indigo-600" />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <input 
                    type="text"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    onClick={() => setShowFileUpload(!showFileUpload)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <Button 
                    onClick={handleSendMessage}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-500">Select a channel or person to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* Forward Message Dialog */}
      {forwardingMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Forward to...</h3>
              <button
                onClick={() => {
                  setForwardingMessage(null);
                  setForwardTarget(null);
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Channels section */}
              <div className="p-4">
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Channels</p>
                <div className="space-y-2">
                  {channels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => setForwardTarget({ type: 'channel', id: channel.id })}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded transition-colors',
                        forwardTarget?.type === 'channel' && forwardTarget?.id === channel.id
                          ? 'bg-indigo-100 text-indigo-900'
                          : 'hover:bg-slate-100 text-slate-900'
                      )}
                    >
                      <p className="font-medium text-sm"># {channel.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* DMs section */}
              <div className="p-4 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Direct Messages</p>
                <div className="space-y-2">
                  {employees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => setForwardTarget({ type: 'dm', id: emp.id })}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded transition-colors flex items-center gap-2',
                        forwardTarget?.type === 'dm' && forwardTarget?.id === emp.id
                          ? 'bg-indigo-100 text-indigo-900'
                          : 'hover:bg-slate-100 text-slate-900'
                      )}
                    >
                      <img
                        src={emp.avatar || `https://i.pravatar.cc/150?u=${emp.email}`}
                        alt={emp.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{emp.name}</p>
                      </div>
                      {onlineUsers.includes(emp.id) && (
                        <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dialog footer */}
            <div className="p-4 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => {
                  setForwardingMessage(null);
                  setForwardTarget(null);
                }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (forwardingMessage && forwardTarget) {
                    const currentMessages = activeChannel && !selectedDM
                      ? messages[activeChannel] || []
                      : directMessages[selectedDM || ''] || [];
                    const msg = currentMessages.find(m => (m._id || m.id) === forwardingMessage);
                    if (msg) {
                      completeForward(msg);
                    }
                  }
                }}
                disabled={!forwardTarget}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Forward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Channel Dialog */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Tạo kênh mới</h3>
              <button
                onClick={() => {
                  setShowCreateChannel(false);
                  setNewChannelName('');
                  setNewChannelDesc('');
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Tên kênh *
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="Nhập tên kênh..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Mô tả
                </label>
                <textarea
                  value={newChannelDesc}
                  onChange={e => setNewChannelDesc(e.target.value)}
                  placeholder="Nhập mô tả kênh (tuỳ chọn)..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => {
                  setShowCreateChannel(false);
                  setNewChannelName('');
                  setNewChannelDesc('');
                }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim()}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tạo kênh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Members Dialog */}
      {showMemberDialog && activeChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900">Quản lý thành viên kênh</h3>
              <button
                onClick={() => setShowMemberDialog(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-slate-600 mb-4">
                Chọn người dùng để thêm hoặc xóa khỏi kênh này:
              </p>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allUsers.map(user => (
                  <label key={user.id} className="flex items-center p-3 hover:bg-slate-50 rounded-lg cursor-pointer border border-slate-200">
                    <input
                      type="checkbox"
                      checked={selectedMemberUsers.has(user.id)}
                      onChange={() => handleToggleMember(user.id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    {user.avatar && (
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-6 h-6 rounded-full ml-2"
                      />
                    )}
                  </label>
                ))}
              </div>
              
              {allUsers.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">Không tìm thấy người dùng nào</p>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex gap-2 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowMemberDialog(false)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveMembers}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Browse & Join Channels Dialog */}
      {showBrowseChannels && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900">🔍 Duyệt và tham gia kênh</h3>
              <button
                onClick={() => setShowBrowseChannels(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {availableChannels.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 mb-2">Không có kênh công khai nào để tham gia</p>
                  <p className="text-sm text-slate-400">Bạn đã tham gia tất cả các kênh hoặc không có kênh nào khả dụng</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableChannels.map(channel => (
                    <div
                      key={channel.id}
                      className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-start justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <h4 className="font-semibold text-slate-900">{channel.name}</h4>
                        </div>
                        {channel.description && (
                          <p className="text-sm text-slate-600 mb-2">{channel.description}</p>
                        )}
                        <p className="text-xs text-slate-500">
                          👥 {(channel as any).memberCount || (channel.members?.length || 0)} thành viên
                        </p>
                      </div>
                      <button
                        onClick={() => handleJoinChannel(channel.id)}
                        disabled={joiningChannelId === channel.id}
                        className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {joiningChannelId === channel.id ? 'Đang tham gia...' : 'Tham gia'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
