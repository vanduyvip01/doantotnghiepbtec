const router = require('express').Router();
const { Attendance, User } = require('../models');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    
    // MEMBER: chỉ xem của chính mình
    if (req.user.role === 'MEMBER') {
      filter.userId = req.user.id;
    }
    // PM: xem của chính mình + team members
    else if (req.user.role === 'PM') {
      if (req.query.userId) {
        filter.userId = req.query.userId;
      } else {
        // Lấy danh sách team members của PM này + PM's own record
        const members = await User.find({ role: 'MEMBER' }).select('_id');
        const memberIds = members.map(m => m._id?.toString()).filter(Boolean);
        const pmId = req.user.id?.toString() || req.user.id;
        filter.userId = { $in: [...memberIds, pmId] };  // Include PM + team members
      }
    }
    // ADMIN: xem tất cả
    
    if (req.query.date)   filter.date = req.query.date;
    if (req.query.month)  filter.date = { $regex: `^${req.query.month}` };
    if (req.query.status) filter.status = req.query.status;

    const records = await Attendance.find(filter)
      .populate('userId', 'name avatar department role')
      .sort({ date: -1, createdAt: -1 });
    
    // Map _id to id
    const response = records.map(r => {
      const userObj = r.userId && typeof r.userId === 'object' ? r.userId.toObject() : {};
      return {
        id: r._id.toString(),
        userId: userObj._id ? userObj._id.toString() : r.userId,  // userId as string for filtering
        date: r.date,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        status: r.status,
        user: userObj._id ? { id: userObj._id.toString(), ...userObj } : undefined,  // Full user object for display
      };
    });
    
    res.json(response);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Check-in (MEMBER and PM)
router.post('/check-in', protect, async (req, res) => {
  try {
    if (req.user.role !== 'MEMBER' && req.user.role !== 'PM') {
      return res.status(403).json({ message: 'Only members and PMs can check in' });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5); // HH:mm
    const isLate = now > '09:00';

    const record = await Attendance.findOneAndUpdate(
      { userId: req.user.id, date: today },
      { checkIn: now, status: isLate ? 'LATE' : 'PRESENT' },
      { upsert: true, new: true }
    ).populate('userId', 'name avatar department role');
    
    // Map response
    const userObj = record.userId && typeof record.userId === 'object' ? record.userId.toObject() : {};
    const response = {
      id: record._id.toString(),
      userId: userObj._id ? userObj._id.toString() : record.userId,
      date: record.date,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      status: record.status,
      user: userObj._id ? { id: userObj._id.toString(), ...userObj } : undefined,
    };
    res.json(response);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Check-out (MEMBER and PM)
router.post('/check-out', protect, async (req, res) => {
  try {
    if (req.user.role !== 'MEMBER' && req.user.role !== 'PM') {
      return res.status(403).json({ message: 'Only members and PMs can check out' });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5);
    const record = await Attendance.findOneAndUpdate(
      { userId: req.user.id, date: today },
      { checkOut: now },
      { new: true }
    ).populate('userId', 'name avatar department role');
    
    if (!record) return res.status(400).json({ message: 'Bạn chưa check-in hôm nay' });
    
    // Map response
    const userObj = record.userId && typeof record.userId === 'object' ? record.userId.toObject() : {};
    const response = {
      id: record._id.toString(),
      userId: userObj._id ? userObj._id.toString() : record.userId,
      date: record.date,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      status: record.status,
      user: userObj._id ? { id: userObj._id.toString(), ...userObj } : undefined,
    };
    res.json(response);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /attendance/report - Export attendance report (ADMIN only)
router.get('/report/export', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { month } = req.query;
    const filter = month ? { date: { $regex: `^${month}` } } : {};
    
    const records = await Attendance.find(filter)
      .populate('userId', 'name email department')
      .sort({ date: -1 });
    
    // Format for CSV/JSON export
    const report = records.map(r => ({
      employeeName: r.userId?.name || 'Unknown',
      email: r.userId?.email || '',
      date: r.date,
      checkIn: r.checkIn || '--',
      checkOut: r.checkOut || '--',
      status: r.status,
      workHours: r.checkIn && r.checkOut ? calculateHours(r.checkIn, r.checkOut) : 0
    }));
    
    res.json({ month: month || 'all', totalRecords: report.length, data: report });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /:id - Edit attendance record (ADMIN only)
router.put('/:id', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { checkIn, checkOut, status, date } = req.body;
    
    const update = {};
    if (checkIn) update.checkIn = checkIn;
    if (checkOut) update.checkOut = checkOut;
    if (status) update.status = status;
    if (date) update.date = date;
    
    const record = await Attendance.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('userId', 'name');
    
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });
    
    // Map response
    const response = {
      ...record.toObject(),
      id: record._id
    };
    res.json(response);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Helper function to calculate work hours
function calculateHours(checkIn, checkOut) {
  const [hIn, mIn] = checkIn.split(':').map(Number);
  const [hOut, mOut] = checkOut.split(':').map(Number);
  return ((hOut * 60 + mOut) - (hIn * 60 + mIn)) / 60;
}

module.exports = router;
