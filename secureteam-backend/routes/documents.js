const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { Document, SecurityLog } = require('../models');
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

const getType = (mime) => {
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('image')) return 'IMAGE';
  if (mime.includes('word')) return 'WORD';
  if (mime.includes('sheet') || mime.includes('excel')) return 'EXCEL';
  return 'OTHER';
};

// Helper: Get client IP
const getClientIp = (req) => req.ip || req.connection.remoteAddress || 'Unknown';

router.get('/', protect, async (req, res) => {
  try {
    const { Project, User, Task } = require('../models');
    let filter = {};
    
    if (req.query.projectId) filter.projectId = req.query.projectId;
    
    // Get user's department info
    const user = await User.findById(req.user.id).select('department role');
    
    // ✅ DEPARTMENT-BASED + TASK-BASED ACCESS CONTROL
    if (req.user.role === 'ADMIN') {
      // ADMIN sees all documents
      console.log('📄 ADMIN viewing all documents');
    } else if (req.user.role === 'PM') {
      // PM sees only documents from their department
      filter.departmentId = user.department;
      console.log(`📄 PM viewing documents from department: ${user.department}`);
    } else if (req.user.role === 'MEMBER') {
      // MEMBER sees:
      // 1. Documents from their department
      // 2. Documents from projects where they have assigned tasks
      // 3. Documents from projects where they are members
      
      const memberProjects = await Project.find({ members: req.user.id });
      const memberTasks = await Task.find({ assigneeId: req.user.id });
      const memberProjectIds = [
        ...memberProjects.map(p => p._id),
        ...memberTasks.map(t => t.projectId)
      ];
      
      filter.$or = [
        { departmentId: user.department },
        { projectId: { $in: memberProjectIds } }
      ];
      console.log(`📄 MEMBER viewing documents from department & assigned projects`);
    }
    
    // Permission check for specific project
    if (filter.projectId && req.user.role !== 'ADMIN') {
      const project = await Project.findById(filter.projectId);
      if (!project) return res.status(404).json({ message: 'Project not found' });
      
      const isProjectPM = req.user.id === project.managerId?.toString();
      const isProjectMember = project.members.includes(req.user.id);
      
      if (!isProjectPM && !isProjectMember) {
        return res.status(403).json({ message: 'No permission to access this project documents' });
      }
    }
    
    let docs = await Document.find(filter)
      .populate('uploadedBy', 'name avatar')
      .populate('projectId', 'name')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 });
    
    // ADMIN thấy honeytokens, MEMBER/PM chỉ thấy legitimate documents
    if (req.user.role !== 'ADMIN') {
      docs = docs.filter(d => !d.isHoneytoken);
    }
    
    // Map _id to id
    const result = docs.map(d => {
      const obj = d.toObject();
      return { ...obj, id: d._id };
    });
    
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn file' });
    
    // Check permission: Only PM (project manager) & ADMIN can upload
    const { Project, User } = require('../models');
    const projectId = req.body.projectId;
    const project = await Project.findById(projectId);
    
    if (!project) return res.status(404).json({ message: 'Project not found' });
    
    const user = await User.findById(req.user.id).select('department role');
    const isAdmin = req.user.role === 'ADMIN';
    const isAssignedPM = req.user.id === project.managerId?.toString();
    const isDepartmentMatch = user.department?.toString() === project.departmentId?.toString();
    
    // ✅ ADMIN can upload to any project, PM can only upload to their department projects
    if (!isAdmin && !isAssignedPM) {
      return res.status(403).json({ message: 'Only project managers can upload documents' });
    }
    
    if (!isAdmin && isAssignedPM && !isDepartmentMatch) {
      return res.status(403).json({ message: 'Chỉ được upload tài liệu cho dự án của phòng ban mình' });
    }
    
    const doc = await Document.create({
      name: req.file.originalname,
      projectId: req.body.projectId,
      departmentId: project.departmentId,
      uploadedBy: req.user.id,
      fileUrl: `/uploads/${req.file.filename}`,
      size: req.file.size,
      mimeType: req.file.mimetype,
      type: getType(req.file.mimetype),
    });
    
    // Map _id to id
    const obj = doc.toObject();
    res.status(201).json({ ...obj, id: doc._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ███ LOG HONEYTOKEN ACCESS ███
router.post('/:id/access', protect, async (req, res) => {
  try {
    const { actionType } = req.body; // 'VIEW' or 'DOWNLOAD'
    const doc = await Document.findById(req.params.id);
    
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    
    const ip = getClientIp(req);
    
    // Nếu là honeytoken → log và alert ADMIN
    if (doc.isHoneytoken) {
      // Log access
      await Document.findByIdAndUpdate(req.params.id, {
        $push: {
          honeytokenAccessLog: {
            userId: req.user.id,
            actionType,
            ipAddress: ip,
            timestamp: new Date()
          }
        }
      });
      
      // Tạo security alert
      await SecurityLog.create({
        userId: req.user.id,
        userName: req.user.name,
        action: `HONEYTOKEN_${actionType}`,
        ipAddress: ip,
        device: req.headers['user-agent'] || 'Unknown',
        status: 'SUCCESS',
        meta: {
          documentId: req.params.id,
          documentName: doc.name,
          alertType: 'SUSPICIOUS_ACCESS',
          severity: 'HIGH'
        }
      });
      
      // Response cho frontend biết là honeytoken
      return res.json({ honeytoken: true, message: 'Access logged' });
    }
    
    res.json({ honeytoken: false });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).populate('projectId', 'managerId');
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    
    // Permission check: Only ADMIN and PM (project manager) can delete
    const isAdmin = req.user.role === 'ADMIN';
    const isProjectPM = req.user.id === doc.projectId?.managerId?.toString();
    
    if (!isAdmin && !isProjectPM) {
      return res.status(403).json({ message: 'Chỉ ADMIN và Project Manager mới có thể xóa tài liệu' });
    }
    
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa tài liệu' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
