const router = require('express').Router();
const { Notification, User } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// GET tất cả notifications của user (có phân trang)
router.get('/', protect, async (req, res) => {
  try {
    const { skip = 0, limit = 20, isRead } = req.query;
    
    const filter = { recipientId: req.user.id };
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('recipientId', 'name avatar')
      .exec();
    
    const total = await Notification.countDocuments(filter);
    
    res.json({
      notifications: notifications.map(n => ({
        ...n.toObject(),
        id: n._id.toString()
      })),
      total,
      unreadCount: await Notification.countDocuments({ recipientId: req.user.id, isRead: false })
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET unread count
router.get('/unread/count', protect, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipientId: req.user.id,
      isRead: false
    });
    
    res.json({ unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH đánh dấu 1 notification đã đọc
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification không tìm thấy' });
    }
    
    if (notification.recipientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền cập nhật notification này' });
    }
    
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
    
    res.json({
      ...notification.toObject(),
      id: notification._id.toString()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH đánh dấu tất cả notifications đã đọc
router.patch('/mark-all/read', protect, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipientId: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    res.json({
      modifiedCount: result.modifiedCount,
      message: `Đã đánh dấu ${result.modifiedCount} thông báo đã đọc`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE 1 notification
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification không tìm thấy' });
    }
    
    if (notification.recipientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền xóa notification này' });
    }
    
    await Notification.deleteOne({ _id: req.params.id });
    
    res.json({ message: 'Notification đã bị xóa' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE tất cả notifications
router.delete('/', protect, async (req, res) => {
  try {
    const result = await Notification.deleteMany({ recipientId: req.user.id });
    
    res.json({
      deletedCount: result.deletedCount,
      message: `Đã xóa ${result.deletedCount} thông báo`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
