const router = require('express').Router();
const { Department, User } = require('../models');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const departments = await Department.find().populate('managerId', 'name email');
    // Đếm nhân viên theo từng phòng ban
    const result = await Promise.all(departments.map(async (d) => {
      const employeeCount = await User.countDocuments({ department: d._id, status: 'ACTIVE' });
      const deptObj = d.toObject();
      return { 
        ...deptObj, 
        id: d._id,  // ✅ Map _id to id
        employeeCount 
      };
    }));
    console.log(`📥 Fetched ${result.length} departments:`, result.map(d => `${d.name} (${d.id})`).join(', '));
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const dept = await Department.create(req.body);
    const deptObj = dept.toObject();
    const response = { ...deptObj, id: dept._id };
    console.log(`✅ Created department: ${response.name} (${response.id})`);
    res.status(201).json(response);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!dept) return res.status(404).json({ message: 'Không tìm thấy phòng ban' });
    res.json(dept);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, authorize('ADMIN'), async (req, res) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa phòng ban' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
