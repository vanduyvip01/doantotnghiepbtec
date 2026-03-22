const router = require('express').Router();
const { Channel, Message } = require('../models');
const { protect } = require('../middleware/auth');

// GET channels của user
router.get('/channels', protect, async (req, res) => {
  try {
    const channels = await Channel.find({ members: req.user.id })
      .populate('members', 'name avatar').populate('createdBy', 'name');
    res.json(channels);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST tạo channel
router.post('/channels', protect, async (req, res) => {
  try {
    const channel = await Channel.create({ ...req.body, createdBy: req.user.id, members: [...(req.body.members || []), req.user.id] });
    res.status(201).json(channel);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET tin nhắn channel
router.get('/channels/:channelId/messages', protect, async (req, res) => {
  try {
    const messages = await Message.find({ channelId: req.params.channelId, isDeleted: false })
      .populate('senderId', 'name avatar').sort({ createdAt: 1 }).limit(100);
    res.json(messages);
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
    res.json(messages);
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
    await msg.save();
    res.json({ message: 'Đã xóa tin nhắn' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
