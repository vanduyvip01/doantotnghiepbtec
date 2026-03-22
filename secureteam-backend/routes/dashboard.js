const router = require('express').Router();
const { User, Project, Task, Attendance, SecurityLog } = require('../models');
const { protect } = require('../middleware/auth');

// GET /api/dashboard/stats - Tổng quan cho Dashboard
router.get('/stats', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [totalEmployees, activeProjects, tasksInProgress, completedTasks, todayAttendance, failedLogins] = await Promise.all([
      User.countDocuments({ status: 'ACTIVE' }),
      Project.countDocuments({ status: 'ACTIVE' }),
      Task.countDocuments({ status: 'IN_PROGRESS' }),
      Task.countDocuments({ status: 'COMPLETED' }),
      Attendance.countDocuments({ date: today, status: { $in: ['PRESENT', 'LATE'] } }),
      SecurityLog.countDocuments({ status: 'FAILED', createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ]);

    res.json({ totalEmployees, activeProjects, tasksInProgress, completedTasks, todayAttendance, failedLogins });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', protect, async (req, res) => {
  try {
    const logs = await SecurityLog.find()
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 }).limit(10);
    res.json(logs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/dashboard/upcoming-deadlines
router.get('/upcoming-deadlines', protect, async (req, res) => {
  try {
    const filter = { status: { $ne: 'COMPLETED' }, deadline: { $gte: new Date() } };
    if (req.user.role === 'MEMBER') filter.assigneeId = req.user.id;
    const tasks = await Task.find(filter)
      .populate('projectId', 'name').populate('assigneeId', 'name avatar')
      .sort({ deadline: 1 }).limit(5);
    res.json(tasks);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
