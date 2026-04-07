const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { Channel, Message } = require('../models');
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

const getAttachmentType = (mime) => {
  // IMAGE
  if (mime.includes('image')) return 'IMAGE';
  // VIDEO
  if (mime.includes('video')) return 'VIDEO';
  // AUDIO
  if (mime.includes('audio')) return 'AUDIO';
  // DOCUMENT (PDF, Word, Excel, etc)
  if (mime.includes('pdf') || mime.includes('word') || mime.includes('sheet') || 
      mime.includes('excel') || mime.includes('text') || mime.includes('document')) {
    return 'DOCUMENT';
  }
  return 'DOCUMENT'; // Default to DOCUMENT
};

// GET channels của user
router.get('/channels', protect, async (req, res) => {
  try {
    const channels = await Channel.find({ members: req.user.id })
      .populate('members', 'name avatar email').populate('createdBy', 'name');
    
    // Map _id to id for frontend compatibility, and extract member IDs
    const channelsWithId = channels.map(ch => {
      const chObj = ch.toObject();
      return {
        ...chObj,
        id: ch._id.toString(),
        members: chObj.members ? chObj.members.map(m => m._id?.toString?.() || m) : []
      };
    });
    
    res.json(channelsWithId);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET all available public channels (for browsing)
router.get('/channels/available/all', protect, async (req, res) => {
  try {
    // Get all public channels (mà user chưa join)
    const userChannels = await Channel.find({ members: req.user.id });
    const userChannelIds = userChannels.map(ch => ch._id.toString());
    
    const publicChannels = await Channel.find({ 
      isPrivate: { $ne: true },
      _id: { $nin: userChannels.map(ch => ch._id) } // Exclude channels user already joined
    })
      .populate('createdBy', 'name')
      .select('name description createdBy createdAt members');
    
    // Map _id to id for frontend compatibility
    const channelsWithId = publicChannels.map(ch => {
      const chObj = ch.toObject();
      return {
        ...chObj,
        id: ch._id.toString(),
        memberCount: chObj.members?.length || 0
      };
    });
    
    res.json(channelsWithId);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST tạo channel (admin only)
router.post('/channels', protect, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Chỉ Admin mới có thể tạo kênh' });
    }
    const channel = await Channel.create({ ...req.body, createdBy: req.user.id, members: [...(req.body.members || []), req.user.id] });
    // Map _id to id for frontend compatibility
    const channelWithId = {
      ...channel.toObject(),
      id: channel._id.toString()
    };
    res.status(201).json(channelWithId);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE xóa channel (admin only)
router.delete('/channels/:channelId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Chỉ Admin mới có thể xóa kênh' });
    }
    let { channelId } = req.params;
    
    // Ensure channelId is not undefined
    if (!channelId || channelId === 'undefined') {
      return res.status(400).json({ message: 'Channel ID is required' });
    }
    
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Kênh không tìm thấy' });
    }
    // Delete all messages in this channel
    await Message.deleteMany({ channelId });
    // Delete the channel
    await Channel.findByIdAndDelete(channelId);
    res.json({ message: 'Kênh đã được xóa', success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET tin nhắn channel
router.get('/channels/:channelId/messages', protect, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    if (!channelId || channelId === 'undefined') {
      return res.status(400).json({ message: 'Channel ID is required' });
    }
    
    const mongoose = require('mongoose');
    const objectId = mongoose.Types.ObjectId.isValid(channelId) 
      ? channelId 
      : null;
    
    if (!objectId) {
      return res.status(400).json({ message: 'Invalid Channel ID format' });
    }
    
    const messages = await Message.find({ channelId: objectId, isDeleted: false })
      .populate('senderId', 'name avatar').sort({ createdAt: 1 }).limit(100);
    
    // Format messages to match frontend expectations
    const formattedMessages = messages.map(msg => {
      const msgObj = msg.toObject();
      return {
        ...msgObj,
        senderId: msgObj.senderId?._id?.toString() || msgObj.senderId,
        senderName: msgObj.senderId?.name || 'Unknown',
        senderAvatar: msgObj.senderId?.avatar || '',
      };
    });
    
    res.json(formattedMessages);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST gửi tin nhắn vào channel
router.post('/channels/:channelId/messages', protect, async (req, res) => {
  try {
    const msg = await Message.create({ senderId: req.user.id, channelId: req.params.channelId, text: req.body.text });
    res.status(201).json(await msg.populate('senderId', 'name avatar'));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET Direct Messages giữa 2 user
router.get('/dm/:userId', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.user.id, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user.id },
      ],
      isDeleted: false,
    }).populate('senderId', 'name avatar').sort({ createdAt: 1 }).limit(100);
    
    // Format messages to match frontend expectations
    const formattedMessages = messages.map(msg => {
      const msgObj = msg.toObject();
      return {
        ...msgObj,
        senderId: msgObj.senderId?._id?.toString() || msgObj.senderId,
        senderName: msgObj.senderId?.name || 'Unknown',
        senderAvatar: msgObj.senderId?.avatar || '',
      };
    });
    
    res.json(formattedMessages);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST gửi DM
router.post('/dm/:userId', protect, async (req, res) => {
  try {
    const msg = await Message.create({ senderId: req.user.id, receiverId: req.params.userId, text: req.body.text });
    res.status(201).json(await msg.populate('senderId', 'name avatar'));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE xóa tin nhắn (soft delete)
router.delete('/messages/:id', protect, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    if (msg.senderId?.toString() !== req.user.id) return res.status(403).json({ message: 'Không có quyền xóa tin nhắn này' });
    msg.isDeleted = true;
    msg.text = '[Đã xóa]';
    await msg.save();
    res.json({ message: 'Đã xóa tin nhắn', success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH sửa tin nhắn
router.patch('/messages/:id', protect, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    if (msg.senderId?.toString() !== req.user.id) return res.status(403).json({ message: 'Không có quyền sửa tin nhắn này' });
    if (msg.isDeleted) return res.status(400).json({ message: 'Không thể sửa tin nhắn đã xóa' });
    
    msg.text = req.body.text;
    await msg.save();
    res.json({ message: 'Sửa tin nhắn thành công', success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST file upload cho chat (messages v2 schema)
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn file' });
    }

    console.log(`📁 Chat file upload: ${req.file.originalname} (${req.file.size} bytes)`);

    // Tạo attachment object theo schema mới
    const attachmentType = getAttachmentType(req.file.mimetype);
    
    // Build full file URL
    const protocol = req.secure ? 'https' : 'http';
    const host = req.get('host') || 'localhost:5000';
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    
    const attachment = {
      type: attachmentType,
      url: fileUrl,
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      width: null,
      height: null,
      duration: null,
      thumbnail: null,
    };

    res.status(201).json({
      success: true,
      attachment: attachment,
      message: 'File uploaded successfully'
    });
  } catch (err) {
    console.error('❌ File upload error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST add reaction to message
router.post('/messages/:id/reaction', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    let reaction = message.reactions.find(r => r.emoji === emoji);
    if (!reaction) {
      message.reactions.push({ emoji, users: [req.user.id] });
    } else {
      if (!reaction.users.includes(req.user.id)) {
        reaction.users.push(req.user.id);
      }
    }

    await message.save();
    res.json(message);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST mark message as read
router.post('/messages/:id/read', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user already marked as read
    const existingRead = message.readBy?.find(r => r.userId?.toString() === req.user.id);
    
    if (!existingRead) {
      if (!message.readBy) message.readBy = [];
      message.readBy.push({ userId: req.user.id, readAt: new Date() });
      await message.save();
    }

    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST reply to message
router.post('/messages/:id/reply', protect, async (req, res) => {
  try {
    const { channelId, receiverId, text, attachments } = req.body;
    const originalMessage = await Message.findById(req.params.id).populate('senderId', 'name');
    
    if (!originalMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const replyMessage = await Message.create({
      senderId: req.user.id,
      channelId: channelId || null,
      receiverId: receiverId || null,
      text,
      attachments: attachments || [],
      replyTo: {
        messageId: originalMessage._id,
        senderId: originalMessage.senderId._id,
        senderName: originalMessage.senderId.name,
        text: originalMessage.text.substring(0, 100), // first 100 chars
      }
    });

    await replyMessage.populate('senderId', 'name avatar');
    res.status(201).json(replyMessage);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST forward message
router.post('/messages/:id/forward', protect, async (req, res) => {
  try {
    const { channelId, receiverId, text } = req.body;
    const originalMessage = await Message.findById(req.params.id).populate('senderId', 'name');
    
    if (!originalMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const forwardedMessage = await Message.create({
      senderId: req.user.id,
      channelId: channelId || null,
      receiverId: receiverId || null,
      text: text || originalMessage.text,
      attachments: originalMessage.attachments || [],
      forwardedFrom: {
        messageId: originalMessage._id,
        senderId: originalMessage.senderId._id,
        senderName: originalMessage.senderId.name,
        channelId: originalMessage.channelId || null,
        receiverId: originalMessage.receiverId || null,
      }
    });

    await forwardedMessage.populate('senderId', 'name avatar');
    res.status(201).json(forwardedMessage);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT thêm/xóa users từ channel (admin only)
router.put('/channels/:channelId/members', protect, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { action, userId } = req.body; // action: 'add' or 'remove'

    if (!channelId || channelId === 'undefined') {
      return res.status(400).json({ message: 'Channel ID is required' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "add" or "remove"' });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Check if user is admin
    const { User } = require('../models');
    const currentUser = await User.findById(req.user.id);
    if (currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can manage channel members' });
    }

    // Add or remove user
    if (action === 'add') {
      if (!channel.members.includes(userId)) {
        channel.members.push(userId);
      }
    } else if (action === 'remove') {
      channel.members = channel.members.filter(memberId => memberId.toString() !== userId.toString());
    }

    await channel.save();
    
    // Re-fetch channel with populated data (can't chain populate after save)
    const populatedChannel = await Channel.findById(channelId)
      .populate('members', 'name avatar email')
      .populate('createdBy', 'name');

    const channelWithId = {
      ...populatedChannel.toObject(),
      id: populatedChannel._id.toString(),
      members: populatedChannel.members ? populatedChannel.members.map(m => m._id?.toString?.() || m) : []
    };

    res.json({
      success: true,
      channel: channelWithId,
      message: `User ${action === 'add' ? 'added to' : 'removed from'} channel`
    });
  } catch (err) {
    console.error('❌ Channel member update error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PUT cập nhật nhiều members cùng lúc (add multiple users)
router.put('/channels/:channelId/members/bulk', protect, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { memberIds } = req.body; // Array of user IDs to add

    if (!channelId || channelId === 'undefined') {
      return res.status(400).json({ message: 'Channel ID is required' });
    }

    if (!Array.isArray(memberIds)) {
      return res.status(400).json({ message: 'memberIds must be an array' });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Check if user is admin
    const { User } = require('../models');
    const currentUser = await User.findById(req.user.id);
    if (currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can manage channel members' });
    }

    // Add all new members (avoid duplicates)
    memberIds.forEach(userId => {
      if (!channel.members.includes(userId)) {
        channel.members.push(userId);
      }
    });

    await channel.save();
    
    // Re-fetch channel with populated data (can't chain populate after save)
    const populatedChannel = await Channel.findById(channelId)
      .populate('members', 'name avatar email')
      .populate('createdBy', 'name');

    const channelWithId = {
      ...populatedChannel.toObject(),
      id: populatedChannel._id.toString(),
      members: populatedChannel.members ? populatedChannel.members.map(m => m._id?.toString?.() || m) : []
    };

    res.json({
      success: true,
      channel: channelWithId,
      message: `${memberIds.length} users added to channel`
    });
  } catch (err) {
    console.error('❌ Bulk member update error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET tất cả users (for DM - tất cả users có thể xem)
router.get('/users/all', protect, async (req, res) => {
  try {
    const { User } = require('../models');
    
    // Tất cả users (không chỉ admin) có thể xem danh sách users khác
    const users = await User.find({ status: 'ACTIVE', _id: { $ne: req.user.id } })
      .select('_id name email avatar role department')
      .sort({ name: 1 });

    const usersWithId = users.map(u => ({
      ...u.toObject(),
      id: u._id.toString()
    }));

    console.log(`✅ Returned ${usersWithId.length} users for user ${req.user.id}`);
    res.json(usersWithId);
  } catch (err) {
    console.error('❌ Fetch all users error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET tất cả users + current user's members (for admin)
router.get('/users/admin/all', protect, async (req, res) => {
  try {
    const { User } = require('../models');
    
    // Check if user is admin
    const currentUser = await User.findById(req.user.id);
    if (currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can use this endpoint' });
    }

    const users = await User.find({ status: 'ACTIVE' })
      .select('_id name email avatar role department')
      .sort({ name: 1 });

    const usersWithId = users.map(u => ({
      ...u.toObject(),
      id: u._id.toString()
    }));

    console.log(`✅ Admin fetched ${usersWithId.length} users`);
    res.json(usersWithId);
  } catch (err) {
    console.error('❌ Fetch admin users error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST user join channel (công khai)
router.post('/channels/:channelId/join', protect, async (req, res) => {
  try {
    const { channelId } = req.params;

    if (!channelId || channelId === 'undefined') {
      return res.status(400).json({ message: 'Channel ID is required' });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Check if channel is private
    if (channel.isPrivate) {
      return res.status(403).json({ message: 'Cannot join private channel' });
    }

    // Check if user already a member
    if (channel.members.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already a member of this channel' });
    }

    // Add user to channel
    channel.members.push(req.user.id);
    await channel.save();
    await channel.populate('members', 'name avatar').populate('createdBy', 'name');

    const channelWithId = {
      ...channel.toObject(),
      id: channel._id.toString()
    };

    res.json({
      success: true,
      channel: channelWithId,
      message: 'Joined channel successfully'
    });
  } catch (err) {
    console.error('❌ Join channel error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── E2E ENCRYPTED MESSAGE ENDPOINTS ────────────────────────────

// POST /dm/:userId/encrypted - Gửi DM mã hoá
// Body: { encryptedText, nonce }
router.post('/dm/:userId/encrypted', protect, async (req, res) => {
  try {
    const { encryptedText, nonce } = req.body;
    const receiverId = req.params.userId;
    
    if (!encryptedText || !nonce) {
      return res.status(400).json({ message: 'encryptedText and nonce are required' });
    }
    
    console.log(`\n🔐 [E2E] Sending encrypted DM to ${receiverId}`);
    
    const msg = await Message.create({
      senderId: req.user.id,
      receiverId,
      isEncrypted: true,
      encryptedText,
      encryptedFor: [{
        userId: receiverId,
        nonce: nonce
      }],
      text: '[Encrypted Message]' // Placeholder
    });
    
    await msg.populate('senderId', 'name avatar');
    
    console.log(`✅ [E2E] Encrypted DM sent: ${msg._id}`);
    
    res.status(201).json({
      ...msg.toObject(),
      message: 'Encrypted message sent'
    });
  } catch (err) {
    console.error(`❌ [E2E] Send encrypted DM error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// POST /channels/:channelId/messages/encrypted - Gửi tin nhắn channel mã hoá
// Body: { encryptedText, nonce }
// For channels: all members can decrypt using own private key + sender's public key
router.post('/channels/:channelId/messages/encrypted', protect, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { encryptedText, nonce } = req.body;
    
    if (!encryptedText || !nonce) {
      return res.status(400).json({ message: 'encryptedText and nonce are required' });
    }
    
    if (!channelId || channelId === 'undefined') {
      return res.status(400).json({ message: 'Channel ID is required' });
    }
    
    console.log(`\n🔐 [E2E] Sending encrypted message to channel ${channelId}`);
    
    // Get channel to know all members
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    // Create encrypted message for all channel members
    const encryptedFor = channel.members.map(memberId => ({
      userId: memberId,
      nonce: nonce // Same nonce for all (since it's box, not secretbox)
    }));
    
    const msg = await Message.create({
      senderId: req.user.id,
      channelId,
      isEncrypted: true,
      encryptedText,
      encryptedFor,
      text: '[Encrypted Message]' // Placeholder
    });
    
    await msg.populate('senderId', 'name avatar');
    
    console.log(`✅ [E2E] Encrypted channel message sent: ${msg._id} to ${channel.members.length} members`);
    
    res.status(201).json({
      ...msg.toObject(),
      message: 'Encrypted message sent to channel'
    });
  } catch (err) {
    console.error(`❌ [E2E] Send encrypted message error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// GET /dm/:userId/encrypted - Lấy DM mã hoá (với decryption hints)
router.get('/dm/:userId/encrypted', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      isEncrypted: true,
      $or: [
        { senderId: req.user.id, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user.id },
      ],
      isDeleted: false,
    })
      .populate('senderId', 'name avatar publicKey')
      .sort({ createdAt: 1 })
      .limit(100);
    
    console.log(`✅ [E2E] Retrieved ${messages.length} encrypted DMs`);
    
    res.json({
      messages: messages.map(msg => ({
        ...msg.toObject(),
        senderPublicKey: msg.senderId?.publicKey // Include sender's public key for decryption
      }))
    });
  } catch (err) {
    console.error(`❌ [E2E] Get encrypted DM error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// GET /channels/:channelId/messages/encrypted - Lấy channel messages mã hoá
router.get('/channels/:channelId/messages/encrypted', protect, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    if (!channelId || channelId === 'undefined') {
      return res.status(400).json({ message: 'Channel ID is required' });
    }
    
    const messages = await Message.find({
      channelId,
      isEncrypted: true,
      isDeleted: false
    })
      .populate('senderId', 'name avatar publicKey')
      .sort({ createdAt: 1 })
      .limit(100);
    
    console.log(`✅ [E2E] Retrieved ${messages.length} encrypted messages from channel ${channelId}`);
    
    res.json({
      messages: messages.map(msg => ({
        ...msg.toObject(),
        senderPublicKey: msg.senderId?.publicKey // Include sender's public key for decryption
      }))
    });
  } catch (err) {
    console.error(`❌ [E2E] Get encrypted messages error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
