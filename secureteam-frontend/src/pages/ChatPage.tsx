import React, { useState } from 'react';
import { Send, Paperclip, Smile, Search, Phone, Video, Info, MoreVertical } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';

export const ChatPage = () => {
  const { user } = useAuthStore();
  const { employees } = useAppStore();
  const [activeChat, setActiveChat] = useState(employees[1]?.id);
  const [message, setMessage] = useState('');

  const chats = [
    { id: 'c1', name: 'General', type: 'channel', lastMsg: 'Meeting at 2 PM', time: '10:30 AM', unread: 2, avatar: '' },
    { id: 'c2', name: 'Cloud Migration', type: 'channel', lastMsg: 'VPC is configured', time: 'Yesterday', unread: 0, avatar: '' },
    ...employees.map(e => ({ id: e.id, name: e.name, type: 'dm', lastMsg: 'Hey there!', time: '2:15 PM', unread: 0, avatar: e.avatar || '' }))
  ];

  const messages = [
    { id: 1, senderId: employees[1]?.id, text: 'Hey, how is the migration going?', time: '10:00 AM' },
    { id: 2, senderId: user?.id, text: 'It is going well! Just finished the VPC setup.', time: '10:05 AM' },
    { id: 3, senderId: employees[1]?.id, text: 'Great! Let me know if you need any help with the RDS instances.', time: '10:06 AM' },
    { id: 4, senderId: user?.id, text: 'Will do, thanks Sarah!', time: '10:10 AM' },
  ];

  const currentChat = chats.find(c => c.id === activeChat);

  return (
    <div className="h-[calc(100vh-12rem)] flex bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Channels</p>
            <div className="space-y-1">
              {chats.filter(c => c.type === 'channel').map(chat => (
                <button 
                  key={chat.id}
                  onClick={() => setActiveChat(chat.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg transition-colors",
                    activeChat === chat.id ? "bg-indigo-50 text-indigo-600" : "hover:bg-slate-50 text-slate-600"
                  )}
                >
                  <span className="text-sm font-medium"># {chat.name}</span>
                  {chat.unread > 0 && <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{chat.unread}</span>}
                </button>
              ))}
            </div>

            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-8 mb-4">Direct Messages</p>
            <div className="space-y-1">
              {chats.filter(c => c.type === 'dm').map(chat => (
                <button 
                  key={chat.id}
                  onClick={() => setActiveChat(chat.id)}
                  className={cn(
                    "w-full flex items-center space-x-3 p-2 rounded-lg transition-colors",
                    activeChat === chat.id ? "bg-indigo-50 text-indigo-600" : "hover:bg-slate-50 text-slate-600"
                  )}
                >
                  <div className="relative">
                    <img src={chat.avatar} alt="" className="w-8 h-8 rounded-full" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{chat.name}</p>
                    <p className="text-xs text-slate-400 truncate">{chat.lastMsg}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {currentChat?.type === 'dm' ? (
              <img src={currentChat.avatar} alt="" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
                #
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-900">{currentChat?.name}</h3>
              <p className="text-xs text-emerald-500 font-medium">Active now</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><Phone className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><Video className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><Info className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            const sender = employees.find(e => e.id === msg.senderId);
            return (
              <div key={msg.id} className={cn("flex space-x-3", isMe ? "flex-row-reverse space-x-reverse" : "")}>
                {!isMe && <img src={sender?.avatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />}
                <div className={cn("max-w-[70%]", isMe ? "items-end" : "items-start")}>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm shadow-sm",
                    isMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-slate-100 text-slate-900 rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center space-x-2 bg-slate-50 rounded-xl p-2">
            <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"><Paperclip className="w-5 h-5" /></button>
            <input 
              type="text" 
              placeholder="Type a message..." 
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"><Smile className="w-5 h-5" /></button>
            <button className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
