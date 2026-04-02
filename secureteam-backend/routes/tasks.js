const router = require('express').Router();
const multer = require('multer');
const { Task, User, TaskComment, TaskAttachment } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

const getFileType = (mime) => {
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('image')) return 'IMAGE';
  if (mime.includes('word')) return 'WORD';
  if (mime.includes('sheet') || mime.includes('excel')) return 'EXCEL';
  if (mime.includes('code') || mime.includes('text') || mime.includes('javascript') || mime.includes('python')) return 'CODE';
  return 'OTHER';
};

router.get('/', protect, async (req, res) => {
  try {
    // Get user info
    const user = await User.findById(req.user.id).select('department role');
    const { Project } = require('../models');
    const filter = {};
    
    // Enforce department-based filtering (ADMIN sees all)
    if (user.role !== 'ADMIN' && user.department) {
      filter.departmentId = user.department;
    }
    
    // MEMBER: only their assigned tasks OR tasks in projects they're members of
    if (user.role === 'MEMBER') {
      const memberProjects = await Project.find({ members: req.user.id });
      filter.$or = [
        { assigneeId: req.user.id },
        { projectId: { $in: memberProjects.map(p => p._id) } }
      ];
    }
    
    // Apply query filters
    if (req.query.projectId) filter.projectId = req.query.projectId;
    if (req.query.status)    filter.status = req.query.status;
    if (req.query.priority)  filter.priority = req.query.priority;
    if (req.query.assigneeId) filter.assigneeId = req.query.assigneeId;

    const tasks = await Task.find(filter)
      .populate('assigneeId', 'name avatar')
      .populate('projectId', 'name')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 });
    
    // Map _id to id
    const result = tasks.map(t => {
      const obj = t.toObject();
      return { ...obj, id: t._id };
    });
    
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, authorize('ADMIN', 'PM'), async (req, res) => {
  try {
    // Get user's department
    const user = await User.findById(req.user.id).select('department role');
    
    // For PM: automatically assign task to their department
    if (user.role === 'PM' && !req.body.departmentId) {
      req.body.departmentId = user.department;
    }
    
    // ADMIN: must specify departmentId
    if (user.role === 'ADMIN' && !req.body.departmentId) {
      return res.status(400).json({ message: 'departmentId là bắt buộc' });
    }
    
    // PM cannot create tasks outside their department
    if (user.role === 'PM' && req.body.departmentId?.toString() !== user.department?.toString()) {
      return res.status(403).json({ message: 'Chỉ được tạo task cho phòng ban của mình' });
    }
    
    const task = await Task.create(req.body);
    const populated = await task.populate([
      { path: 'assigneeId', select: 'name avatar' },
      { path: 'projectId', select: 'name' },
      { path: 'departmentId', select: 'name' }
    ]);
    const obj = populated.toObject();
    res.status(201).json({ ...obj, id: task._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH chỉ cập nhật status (drag & drop Kanban)
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Không tìm thấy task' });

    // Get user info for department check
    const user = await User.findById(req.user.id).select('department role');
    
    // Check department permission (ADMIN can edit all)
    if (user.role !== 'ADMIN' && task.departmentId?.toString() !== user.department?.toString()) {
      return res.status(403).json({ message: 'Task này thuộc phòng ban khác' });
    }
    
    // MEMBER chỉ được cập nhật task của mình
    if (user.role === 'MEMBER' && task.assigneeId?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không phải người được giao task này' });
    }
    
    task.status = status;
    await task.save(); // trigger pre-save để set completedAt
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, authorize('ADMIN', 'PM'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Không tìm thấy task' });
    
    // Get user info for department check
    const user = await User.findById(req.user.id).select('department role');
    
    // Check department permission (ADMIN can edit all)
    if (user.role !== 'ADMIN' && task.departmentId?.toString() !== user.department?.toString()) {
      return res.status(403).json({ message: 'Task này thuộc phòng ban khác' });
    }
    
    // PM cannot change departmentId
    if (user.role === 'PM') {
      delete req.body.departmentId;
    }
    
    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('assigneeId', 'name avatar')
      .populate('projectId', 'name')
      .populate('departmentId', 'name');
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, authorize('ADMIN', 'PM'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Không tìm thấy task' });
    
    // Get user info for department check
    const user = await User.findById(req.user.id).select('department role');
    
    // Check department permission (ADMIN can delete all)
    if (user.role !== 'ADMIN' && task.departmentId?.toString() !== user.department?.toString()) {
      return res.status(403).json({ message: 'Task này thuộc phòng ban khác' });
    }
    
    // Delete associated comments and attachments
    await TaskComment.deleteMany({ taskId: req.params.id });
    await TaskAttachment.deleteMany({ taskId: req.params.id });
    
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa task' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET TASK DETAIL (với comments & attachments) ──
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assigneeId', 'name email avatar')
      .populate('projectId', 'name')
      .populate('departmentId', 'name');
    
    if (!task) return res.status(404).json({ message: 'Không tìm thấy task' });
    
    // Permission check
    const user = await User.findById(req.user.id).select('department role');
    
    // ADMIN can see all tasks
    if (user.role === 'ADMIN') {
      // Allow
    }
    // PM can see tasks in their department
    else if (user.role === 'PM' && task.departmentId?.toString() === user.department?.toString()) {
      // Allow
    }
    // MEMBER can see if:
    // 1. Assigned to them
    // 2. In a project they're a member of
    else if (user.role === 'MEMBER') {
      const { Project } = require('../models');
      const isAssignee = task.assigneeId?.toString() === req.user.id;
      
      let isProjectMember = false;
      if (task.projectId) {
        const project = await Project.findById(task.projectId);
        isProjectMember = project && project.members && project.members.some(m => m.toString() === req.user.id);
      }
      
      if (!isAssignee && !isProjectMember) {
        return res.status(403).json({ message: 'No permission to view this task' });
      }
    } else {
      return res.status(403).json({ message: 'No permission to view this task' });
    }
    
    // Get comments
    const comments = await TaskComment.find({ taskId: req.params.id })
      .populate('authorId', 'name avatar')
      .populate('mentions', 'name')
      .sort({ createdAt: -1 });
    
    // Get attachments
    const attachments = await TaskAttachment.find({ taskId: req.params.id })
      .populate('uploadedBy', 'name avatar')
      .sort({ createdAt: -1 });
    
    const obj = task.toObject();
    
    // ✅ Normalize IDs in response
    const normalizedAssigneeId = obj.assigneeId ? {
      ...obj.assigneeId,
      id: obj.assigneeId.id || obj.assigneeId._id
    } : null;
    
    res.json({ 
      ...obj, 
      id: task._id, 
      assigneeId: normalizedAssigneeId,
      comments, 
      attachments 
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST COMMENT ──
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { text, mentions } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    const comment = await TaskComment.create({
      taskId: req.params.id,
      authorId: req.user.id,
      text,
      mentions: mentions || []
    });
    
    await comment.populate([
      { path: 'authorId', select: 'name avatar' },
      { path: 'mentions', select: 'name' }
    ]);
    
    const obj = comment.toObject();
    res.status(201).json({ ...obj, id: comment._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE COMMENT ──
router.delete('/:id/comments/:commentId', protect, async (req, res) => {
  try {
    const comment = await TaskComment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    
    // Only author or ADMIN can delete
    if (req.user.id !== comment.authorId?.toString() && (await User.findById(req.user.id)).role !== 'ADMIN') {
      return res.status(403).json({ message: 'No permission to delete this comment' });
    }
    
    await TaskComment.findByIdAndDelete(req.params.commentId);
    res.json({ message: 'Comment deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST FILE ATTACHMENT ──
router.post('/:id/attachments', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    // Permission check: assignee or PM/ADMIN
    const user = await User.findById(req.user.id).select('department role');
    if (user.role === 'MEMBER' && task.assigneeId?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only assignee can upload files' });
    }
    
    const attachment = await TaskAttachment.create({
      taskId: req.params.id,
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      fileType: getFileType(req.file.mimetype)
    });
    
    await attachment.populate('uploadedBy', 'name avatar');
    
    const obj = attachment.toObject();
    res.status(201).json({ ...obj, id: attachment._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE FILE ATTACHMENT ──
router.delete('/:id/attachments/:attachmentId', protect, async (req, res) => {
  try {
    const attachment = await TaskAttachment.findById(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });
    
    // Only uploader or ADMIN can delete
    const user = (await User.findById(req.user.id)).role;
    if (req.user.id !== attachment.uploadedBy?.toString() && user !== 'ADMIN') {
      return res.status(403).json({ message: 'No permission to delete this attachment' });
    }
    
    await TaskAttachment.findByIdAndDelete(req.params.attachmentId);
    res.json({ message: 'Attachment deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
