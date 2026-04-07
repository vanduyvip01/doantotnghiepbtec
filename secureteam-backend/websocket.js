const { Message, Channel, User, Notification } = require('./models');

// Track online users: { userId: socketId }
const onlineUsers = new Map();

// Track user socket connections: { socketId: userId }
const userSockets = new Map();

// Helper function to create and emit notifications
const createNotification = async (io, recipientId, type, title, message, relatedData = {}) => {
  try {
    const notification = await Notification.create({
      recipientId,
      type,
      title,
      message,
      relatedData,
      isRead: false
    });
    
    // Emit to recipient's personal room
    io.to(`user:${recipientId}`).emit('notification:new', {
      ...notification.toObject(),
      id: notification._id.toString()
    });
    
    console.log(`📬 Notification created for user ${recipientId}: ${title}`);
  } catch (err) {
    console.error('❌ Error creating notification:', err.message);
  }
};

const initWebSocket = (io) => {
  // Log any server errors
  io.engine.on('connection_error', (err) => {
    console.error('❌ Socket.IO engine connection error:', err.message);
  });

  io.on('connection', async (socket) => {
    console.log(`✅ User connected: ${socket.id}`);
    
    // Handle any immediate errors on this socket
    socket.once('error', (err) => {
      console.error(`❌ User socket error (${socket.id}):`, err);
    });

    // ══════ USER JOINS ══════
    socket.on('user:join', async (data) => {
      try {
        const { userId, userName } = data;
        
        onlineUsers.set(userId, socket.id);
        userSockets.set(socket.id, userId);
        
        console.log(`👤 ${userName} (${userId}) joined - Online users: ${onlineUsers.size}`);
        
        // Notify all users about who's online
        io.emit('users:online', Array.from(onlineUsers.keys()));
        
        // Join user to their personal room (for notifications)
        socket.join(`user:${userId}`);
      } catch (err) {
        console.error('❌ user:join error:', err.message);
        socket.emit('error', { message: err.message });
      }
    });

    // ══════ CHANNEL MESSAGE (với attachments, reply, reactions) ══════
    socket.on('message:send', async (data) => {
      try {
        const { channelId, text, senderId, attachments, replyTo } = data;
        
        console.log(`💬 Message in channel ${channelId}: ${senderId}`);
        
        // Save message to DB (v2 schema)
        const message = await Message.create({
          channelId,
          senderId,
          text,
          attachments: attachments || [],
          replyTo: replyTo || null,
          reactions: [],
          readBy: [{ userId: senderId, readAt: new Date() }]
        });
        
        // Populate sender info from DB
        await message.populate('senderId', 'name avatar');
        
        // Extract sender info (senderId is now populated object)
        const senderObj = message.senderId;
        const senderName = senderObj?.name || 'Unknown';
        const senderAvatar = senderObj?.avatar || '';
        
        // Broadcast to channel
        io.to(`channel:${channelId}`).emit('message:receive', {
          _id: message._id,
          id: message._id,
          channelId,
          senderId: senderId.toString(), // Keep as string for comparison
          senderName,
          senderAvatar,
          text,
          attachments: message.attachments || [],
          replyTo: message.replyTo || null,
          readBy: message.readBy || [],
          reactions: [],
          createdAt: message.createdAt,
          isDeleted: false
        });
        
        // Create notifications for other channel members (not the sender)
        const channel = await Channel.findById(channelId).populate('members');
        if (channel && channel.members) {
          for (const member of channel.members) {
            if (member._id.toString() !== senderId.toString()) {
              await createNotification(io, member._id.toString(), 'MESSAGE',
                `New message from ${senderName} in #${channel.name}`,
                text.substring(0, 100),
                { senderId, senderName, channelId, channelName: channel.name, messageId: message._id.toString() }
              );
            }
          }
        }
        
      } catch (err) {
        console.error('❌ message:send error:', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ══════ DIRECT MESSAGE (với attachments, reply) ══════
    socket.on('dm:send', async (data) => {
      try {
        const { receiverId, text, senderId, attachments, replyTo } = data;
        
        console.log(`💌 DM from ${senderId} to ${receiverId}: "${text.substring(0, 50)}..."`);
        
        if (!senderId || !receiverId || !text) {
          console.warn('⚠️ Invalid DM data:', { senderId, receiverId, text: !!text });
          socket.emit('error', { message: 'Invalid DM data' });
          return;
        }
        
        // Save DM to DB (v2 schema)
        const message = await Message.create({
          senderId,
          receiverId,
          text,
          attachments: attachments || [],
          replyTo: replyTo || null,
          reactions: [],
          readBy: [{ userId: senderId, readAt: new Date() }]
        });
        
        console.log(`✅ DM saved to DB: ${message._id}`);
        
        await message.populate('senderId', 'name avatar');
        
        // Extract sender info from populated data
        const senderObj = message.senderId;
        const senderName = senderObj?.name || 'Unknown';
        const senderAvatar = senderObj?.avatar || '';
        
        // Get receiver's socket
        const receiverSocketId = onlineUsers.get(receiverId);
        
        const dmData = {
          _id: message._id,
          id: message._id,
          senderId: senderId.toString(),
          receiverId,
          senderName,
          senderAvatar,
          text,
          attachments: message.attachments || [],
          replyTo: message.replyTo || null,
          readBy: message.readBy || [],
          reactions: [],
          createdAt: message.createdAt,
          isDeleted: false
        };
        
        // Create notification for receiver
        await createNotification(io, receiverId, 'MESSAGE', 
          `New message from ${senderName}`,
          text.substring(0, 100),
          { senderId, senderName, messageId: message._id.toString() }
        );
        
        // Send to receiver if online
        if (receiverSocketId) {
          console.log(`📤 Sending dm:receive to receiver (${receiverId})`);
          io.to(receiverSocketId).emit('dm:receive', dmData);
        } else {
          console.log(`⚪ Receiver ${receiverId} is offline, message saved in DB`);
        }
        
        // Confirm to sender
        console.log(`📤 Sending dm:sent confirmation to sender`);
        socket.emit('dm:sent', dmData);
        
      } catch (err) {
        console.error('❌ dm:send error:', err.message);
        socket.emit('error', { message: 'Failed to send DM' });
      }
    });

    // ══════ FILE UPLOAD (v2 schema with proper attachments) ══════
    socket.on('file:upload', async (data) => {
      try {
        const { channelId, receiverId, attachment, senderId, messageType } = data;
        
        console.log(`📁 File upload: ${attachment.name} (${attachment.size} bytes)`);
        
        // Create message with attachment (v2 schema)
        const message = await Message.create({
          channelId: channelId || null,
          receiverId: receiverId || null,
          senderId,
          text: `📎 ${attachment.name}`,
          attachments: [attachment],
          reactions: [],
          readBy: [{ userId: senderId, readAt: new Date() }]
        });
        
        await message.populate('senderId', 'name avatar');
        
        // Extract sender info from populated data
        const senderObj = message.senderId;
        const senderName = senderObj?.name || 'Unknown';
        const senderAvatar = senderObj?.avatar || '';
        
        const fileData = {
          _id: message._id,
          id: message._id,
          senderId: senderId.toString(),
          senderName,
          senderAvatar,
          text: `📎 ${attachment.name}`,
          attachments: [attachment],
          readBy: message.readBy || [],
          reactions: [],
          createdAt: message.createdAt,
          isDeleted: false
        };
        
        if (messageType === 'channel') {
          io.to(`channel:${channelId}`).emit('message:receive', fileData);
        } else if (messageType === 'dm') {
          const receiverSocketId = onlineUsers.get(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('dm:receive', fileData);
          }
          socket.emit('dm:sent', fileData);
        }
        
      } catch (err) {
        console.error('❌ file:upload error:', err.message);
        socket.emit('error', { message: 'Failed to upload file' });
      }
    });

    // ══════ CHANNEL JOIN ══════
    socket.on('channel:join', (data) => {
      try {
        const { channelId } = data;
        socket.join(`channel:${channelId}`);
        console.log(`📌 User ${socket.id} joined channel ${channelId}`);
        
        // Notify channel members
        io.to(`channel:${channelId}`).emit('channel:user:joined', { channelId });
      } catch (err) {
        console.error('❌ channel:join error:', err.message);
      }
    });

    // ══════ TYPING ══════
    socket.on('typing:start', (data) => {
      try {
        const { channelId, userName } = data;
        io.to(`channel:${channelId}`).emit('typing:indicator', { 
          userName, 
          isTyping: true 
        });
      } catch (err) {
        console.error('❌ typing:start error:', err.message);
      }
    });

    socket.on('typing:stop', (data) => {
      try {
        const { channelId, userName } = data;
        io.to(`channel:${channelId}`).emit('typing:indicator', { 
          userName, 
          isTyping: false 
        });
      } catch (err) {
        console.error('❌ typing:stop error:', err.message);
      }
    });

    // ══════ REACTIONS ══════
    socket.on('message:reaction:add', async (data) => {
      try {
        const { messageId, emoji, channelId, receiverId, userId } = data;
        
        const message = await Message.findById(messageId);
        if (!message) return;
        
        let reaction = message.reactions.find(r => r.emoji === emoji);
        if (!reaction) {
          message.reactions.push({ emoji, users: [userId] });
        } else {
          if (!reaction.users.includes(userId)) {
            reaction.users.push(userId);
          }
        }
        
        await message.save();
        
        // Broadcast to channel
        if (channelId) {
          io.to(`channel:${channelId}`).emit('message:reaction:added', {
            messageId,
            emoji,
            users: reaction.users
          });
        } else if (receiverId) {
          // Broadcast to DM room
          io.to(`dm:${[userId, receiverId].sort().join('-')}`).emit('message:reaction:added', {
            messageId,
            emoji,
            users: reaction.users
          });
        }
      } catch (err) {
        console.error('❌ message:reaction:add error:', err.message);
      }
    });

    // ══════ READ RECEIPTS ══════
    socket.on('message:read', async (data) => {
      try {
        const { messageId, channelId, userId } = data;
        
        const message = await Message.findById(messageId);
        if (!message) return;
        
        const alreadyRead = message.readBy?.find(r => r.userId?.toString() === userId);
        if (!alreadyRead) {
          if (!message.readBy) message.readBy = [];
          message.readBy.push({ userId, readAt: new Date() });
          await message.save();
        }
        
        // Broadcast read status to channel
        if (channelId) {
          io.to(`channel:${channelId}`).emit('message:read:updated', {
            messageId,
            userId,
            readAt: new Date()
          });
        }
      } catch (err) {
        console.error('❌ message:read error:', err.message);
      }
    });

    // ══════ MESSAGE REPLY ══════
    socket.on('message:reply', async (data) => {
      try {
        const { replyToId, channelId, receiverId, text, senderId, senderName, senderAvatar, attachments } = data;
        
        const originalMessage = await Message.findById(replyToId).populate('senderId', 'name');
        if (!originalMessage) return;
        
        const replyMessage = await Message.create({
          senderId,
          channelId: channelId || null,
          receiverId: receiverId || null,
          text,
          attachments: attachments || [],
          replyTo: {
            messageId: replyToId,
            senderId: originalMessage.senderId._id,
            senderName: originalMessage.senderId.name,
            text: originalMessage.text.substring(0, 100)
          },
          readBy: [{ userId: senderId, readAt: new Date() }]
        });
        
        await replyMessage.populate('senderId', 'name avatar');
        
        const replyData = {
          _id: replyMessage._id,
          id: replyMessage._id,
          senderId,
          senderName,
          senderAvatar,
          text,
          attachments: replyMessage.attachments || [],
          replyTo: replyMessage.replyTo,
          readBy: replyMessage.readBy || [],
          reactions: [],
          createdAt: replyMessage.createdAt,
          isDeleted: false
        };
        
        if (channelId) {
          io.to(`channel:${channelId}`).emit('message:receive', replyData);
        } else if (receiverId) {
          const receiverSocketId = onlineUsers.get(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('dm:receive', replyData);
          }
          socket.emit('dm:sent', replyData);
        }
      } catch (err) {
        console.error('❌ message:reply error:', err.message);
      }
    });

    // ══════ MESSAGE FORWARD ══════
    socket.on('message:forward', async (data) => {
      try {
        const { forwardToChannelId, forwardToReceiverId, messageId, senderId, senderName, senderAvatar, text } = data;
        
        const originalMessage = await Message.findById(messageId).populate('senderId', 'name');
        if (!originalMessage) return;
        
        const forwardedMessage = await Message.create({
          senderId,
          channelId: forwardToChannelId || null,
          receiverId: forwardToReceiverId || null,
          text: text || originalMessage.text,
          attachments: originalMessage.attachments || [],
          forwardedFrom: {
            messageId: messageId,
            senderId: originalMessage.senderId._id,
            senderName: originalMessage.senderId.name,
            channelId: originalMessage.channelId || null,
            receiverId: originalMessage.receiverId || null
          },
          readBy: [{ userId: senderId, readAt: new Date() }]
        });
        
        await forwardedMessage.populate('senderId', 'name avatar');
        
        const forwardData = {
          _id: forwardedMessage._id,
          id: forwardedMessage._id,
          senderId,
          senderName,
          senderAvatar,
          text: text || originalMessage.text,
          attachments: forwardedMessage.attachments || [],
          forwardedFrom: forwardedMessage.forwardedFrom,
          readBy: forwardedMessage.readBy || [],
          reactions: [],
          createdAt: forwardedMessage.createdAt,
          isDeleted: false
        };
        
        if (forwardToChannelId) {
          io.to(`channel:${forwardToChannelId}`).emit('message:receive', forwardData);
        } else if (forwardToReceiverId) {
          const receiverSocketId = onlineUsers.get(forwardToReceiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('dm:receive', forwardData);
          }
          socket.emit('dm:sent', forwardData);
        }
      } catch (err) {
        console.error('❌ message:forward error:', err.message);
      }
    });

    // ══════ E2E ENCRYPTED MESSAGES ══════
    
    // Encrypted channel message
    socket.on('message:send:encrypted', async (data) => {
      try {
        const { channelId, encryptedText, nonce, senderId } = data;
        
        console.log(`🔐 [E2E] Encrypted message in channel ${channelId}`);
        
        // Get channel members
        const channel = await Channel.findById(channelId);
        if (!channel) {
          socket.emit('error', { message: 'Channel not found' });
          return;
        }
        
        // Save encrypted message
        const message = await Message.create({
          channelId,
          senderId,
          isEncrypted: true,
          encryptedText,
          encryptedFor: channel.members.map(memberId => ({
            userId: memberId,
            nonce
          })),
          text: '[Encrypted Message]',
          readBy: [{ userId: senderId, readAt: new Date() }]
        });
        
        await message.populate('senderId', 'name avatar publicKey');
        
        const senderObj = message.senderId;
        
        // Broadcast to channel
        io.to(`channel:${channelId}`).emit('message:receive:encrypted', {
          _id: message._id,
          id: message._id,
          channelId,
          senderId: senderId.toString(),
          senderName: senderObj?.name || 'Unknown',
          senderAvatar: senderObj?.avatar || '',
          senderPublicKey: senderObj?.publicKey, // For decryption
          encryptedText,
          nonce,
          isEncrypted: true,
          createdAt: message.createdAt
        });
        
        console.log(`✅ [E2E] Encrypted message broadcast to channel`);
      } catch (err) {
        console.error('❌ message:send:encrypted error:', err.message);
        socket.emit('error', { message: 'Failed to send encrypted message' });
      }
    });

    // Encrypted DM
    socket.on('dm:send:encrypted', async (data) => {
      try {
        const { receiverId, encryptedText, nonce, senderId } = data;
        
        console.log(`🔐 [E2E] Encrypted DM from ${senderId} to ${receiverId}`);
        
        if (!senderId || !receiverId || !encryptedText || !nonce) {
          socket.emit('error', { message: 'Invalid encrypted DM data' });
          return;
        }
        
        // Save encrypted DM
        const message = await Message.create({
          senderId,
          receiverId,
          isEncrypted: true,
          encryptedText,
          encryptedFor: [{
            userId: receiverId,
            nonce
          }],
          text: '[Encrypted Message]',
          readBy: [{ userId: senderId, readAt: new Date() }]
        });
        
        await message.populate('senderId', 'name avatar publicKey');
        
        const senderObj = message.senderId;
        
        const dmData = {
          _id: message._id,
          id: message._id,
          senderId: senderId.toString(),
          receiverId,
          senderName: senderObj?.name || 'Unknown',
          senderAvatar: senderObj?.avatar || '',
          senderPublicKey: senderObj?.publicKey, // For decryption
          encryptedText,
          nonce,
          isEncrypted: true,
          createdAt: message.createdAt
        };
        
        // Get receiver's socket
        const receiverSocketId = onlineUsers.get(receiverId);
        
        // Send to receiver if online
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('dm:receive:encrypted', dmData);
          console.log(`📤 [E2E] Encrypted DM sent to receiver`);
        } else {
          console.log(`⚪ [E2E] Receiver is offline, message saved in DB`);
        }
        
        // Confirm to sender
        socket.emit('dm:sent:encrypted', dmData);
        
        console.log(`✅ [E2E] Encrypted DM saved`);
      } catch (err) {
        console.error('❌ dm:send:encrypted error:', err.message);
        socket.emit('error', { message: 'Failed to send encrypted DM' });
      }
    });

    // ══════ USER DISCONNECT ══════
    socket.on('disconnect', () => {
      try {
        const userId = userSockets.get(socket.id);
        
        if (userId) {
          onlineUsers.delete(userId);
          userSockets.delete(socket.id);
          
          console.log(`❌ User ${userId} disconnected - Online users: ${onlineUsers.size}`);
          io.emit('users:online', Array.from(onlineUsers.keys()));
        }
      } catch (err) {
        console.error('❌ disconnect error:', err.message);
      }
    });

    // ══════ ERROR HANDLER ══════
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });
};

module.exports = { initWebSocket, onlineUsers, userSockets };
