const router = require('express').Router();
const { Project, Task, Notification } = require('../models');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    // ADMIN sees all projects
    // PM sees projects they manage + projects they're members of
    // MEMBER sees only projects they're members of
    if (req.user.role === 'PM') {
      filter.$or = [{ managerId: req.user.id }, { members: req.user.id }];
    } else if (req.user.role === 'MEMBER') {
      filter.members = req.user.id;
    }
    if (req.query.status) filter.status = req.query.status;

    const projects = await Project.find(filter)
      .populate('managerId', 'name avatar')
      .populate({
        path: 'members',
        select: 'name avatar department',
        populate: { path: 'department', select: 'name' }
      })
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 });
    
    // Map _id to id và tính progress từ tasks
    const result = await Promise.all(projects.map(async p => {
      const obj = p.toObject();
      
      // Tính progress dựa trên số tasks COMPLETED
      const tasks = await Task.find({ projectId: p._id });
      const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
      const totalCount = tasks.length;
      const calculatedProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      
      return { ...obj, id: p._id, progress: calculatedProgress };
    }));
    
    console.log(`📥 Fetched ${result.length} projects with calculated progress`);
    result.forEach(p => console.log(`  - ${p.name}: ${p.progress}% (tasks)`));
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('managerId', 'name email avatar')
      .populate({
        path: 'members',
        select: 'name email avatar role department',
        populate: { path: 'department', select: 'name' }
      })
      .populate('departmentId', 'name');
    if (!project) return res.status(404).json({ message: 'Không tìm thấy dự án' });
    res.json(project);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, description, managerId, members, departmentId, deadline, status = 'PLANNING' } = req.body;
    console.log(`📋 ADMIN creating project: ${name}, assigning to PM: ${managerId}, department: ${departmentId}`);
    const project = await Project.create({ name, description, managerId, members, departmentId, deadline, status, progress: 0 });
    // Populate real names before returning
    const populated = await project.populate([
      { path: 'managerId', select: 'name avatar' },
      {
        path: 'members',
        select: 'name avatar department',
        populate: { path: 'department', select: 'name' }
      },
      { path: 'departmentId', select: 'name' }
    ]);
    const obj = populated.toObject();
    res.status(201).json({ ...obj, id: project._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Không tìm thấy dự án' });
    
    // ADMIN: Can edit anything
    // PM (assigned manager): Can only add/remove members and manage status
    // MEMBER: Cannot edit
    const isAdmin = req.user.role === 'ADMIN';
    const isAssignedPM = req.user.id === project.managerId?.toString();
    
    if (!isAdmin && !isAssignedPM) {
      return res.status(403).json({ message: 'Không có quyền sửa dự án này' });
    }
    
    // PM can only edit members and status, not name/description/manager
    if (isAssignedPM && !isAdmin) {
      const allowedFields = { members: req.body.members, status: req.body.status };
      req.body = allowedFields;
    }
    
    // Track new members being added
    const oldMembers = project.members.map(m => m.toString());
    const newMembers = req.body.members || [];
    const addedMembers = newMembers.filter(memberId => !oldMembers.includes(memberId.toString()));
    
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('managerId', 'name avatar')
      .populate({
        path: 'members',
        select: 'name avatar department',
        populate: { path: 'department', select: 'name' }
      })
      .populate('departmentId', 'name');
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy dự án' });
    
    // Create notifications for newly added members
    for (const memberId of addedMembers) {
      await Notification.create({
        recipientId: memberId,
        type: 'PROJECT_ASSIGNED',
        title: '📌 New Project Assigned',
        message: `You have been added to project: ${updated.name}`,
        relatedData: { projectId: updated._id.toString(), projectName: updated.name },
        isRead: false,
        actionUrl: `/projects/${updated._id}`
      });
    }
    
    const obj = updated.toObject();
    res.json({ ...obj, id: updated._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /projects/:id/report ────────────────────────────
// PM & ADMIN only: Detailed project report
router.get('/:id/report', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('managerId', 'name email avatar')
      .populate({
        path: 'members',
        select: 'name email avatar role department',
        populate: { path: 'department', select: 'name' }
      })
      .populate('departmentId', 'name');
    
    if (!project) return res.status(404).json({ message: 'Project not found' });
    
    // Permission check: Only PM (manager) + ADMIN can view report
    const isAdmin = req.user.role === 'ADMIN';
    const isAssignedPM = req.user.id === project.managerId?.toString();
    
    if (!isAdmin && !isAssignedPM) {
      return res.status(403).json({ message: 'No permission to view this report' });
    }
    
    // Get all tasks for this project
    const tasks = await Task.find({ projectId: project._id }).populate('assigneeId', 'name email');
    
    // Calculate statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const reviewTasks = tasks.filter(t => t.status === 'REVIEW').length;
    const todoTasks = tasks.filter(t => t.status === 'TODO').length;
    
    // Risk assessment: overdue & blocked
    const now = new Date();
    const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'COMPLETED');
    const urgentTasks = tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED');
    
    // Team member progress breakdown
    const memberStats = project.members.map((member) => {
      const memberTasks = tasks.filter(t => t.assigneeId?._id?.toString() === member._id?.toString());
      const memberCompleted = memberTasks.filter(t => t.status === 'COMPLETED').length;
      const memberProgress = memberTasks.length > 0 ? Math.round((memberCompleted / memberTasks.length) * 100) : 0;
      
      return {
        memberId: member._id,
        name: member.name,
        email: member.email,
        totalTasks: memberTasks.length,
        completedTasks: memberCompleted,
        inProgressTasks: memberTasks.filter(t => t.status === 'IN_PROGRESS').length,
        progress: memberProgress,
      };
    });
    
    // Overall progress
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Timeline info
    const daysRemaining = Math.ceil((new Date(project.deadline) - now) / (1000 * 60 * 60 * 24));
    const isOverdue = daysRemaining < 0;
    
    res.json({
      project: {
        id: project._id,
        name: project.name,
        status: project.status,
        deadline: project.deadline,
        daysRemaining: isOverdue ? 0 : daysRemaining,
        isOverdue,
      },
      overview: {
        overallProgress,
        totalTasks,
        completedTasks,
        inProgressTasks,
        reviewTasks,
        todoTasks,
        completionRate: totalTasks > 0 ? `${overallProgress}%` : '0%',
      },
      riskAssessment: {
        overdueTasks: overdueTasks.length,
        overdueTasksList: overdueTasks.map(t => ({
          id: t._id,
          title: t.title,
          assignee: t.assigneeId?.name || 'Unassigned',
          deadline: t.deadline,
          priority: t.priority,
        })),
        urgentTasks: urgentTasks.length,
        urgentTasksList: urgentTasks.map(t => ({
          id: t._id,
          title: t.title,
          assignee: t.assigneeId?.name || 'Unassigned',
          status: t.status,
        })),
      },
      teamPerformance: memberStats,
      summary: {
        message: isOverdue 
          ? `⚠️ Project is ${Math.abs(daysRemaining)} days overdue. ${overallProgress}% complete.`
          : `✅ ${daysRemaining} days remaining. ${overallProgress}% complete.`,
      }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, authorize('ADMIN'), async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa dự án' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
