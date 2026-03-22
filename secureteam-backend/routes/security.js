const router = require('express').Router();
const { SecurityLog } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// Chỉ ADMIN xem được security logs
router.get('/', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.action) filter.action = { $regex: req.query.action, $options: 'i' };

    const logs = await SecurityLog.find(filter)
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 100);
    res.json(logs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Thống kê nhanh
router.get('/stats', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const [total, success, failed] = await Promise.all([
      SecurityLog.countDocuments(),
      SecurityLog.countDocuments({ status: 'SUCCESS' }),
      SecurityLog.countDocuments({ status: 'FAILED' }),
    ]);
    res.json({ total, success, failed, suspicious: failed });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
