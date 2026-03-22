const router = require('express').Router();
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User, Department } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// GET /api/users - Lấy danh sách nhân viên (ADMIN, PM)
router.get('/', protect, authorize('ADMIN', 'PM'), async (req, res) => {
  try {
    const { search, role, status, department } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (department) filter.department = department;

    const users = await User.find(filter)
      .populate('department', 'name')
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    
    console.log(`📊 Fetched ${users.length} employees`);
    users.forEach(u => console.log(`  - ${u.name} (${u.email}) -> dept: ${u.department?.name || 'None'}`));
    
    // ✅ Map _id to id for consistency
    const response = users.map(u => ({
      ...u.toObject(),
      id: u._id
    }));
    res.json(response);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/:id - Chi tiết user
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('department', 'name').select('-passwordHash -twoFactorSecret');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    
    // ✅ Map _id to id for consistency
    const response = {
      ...user.toObject(),
      id: user._id
    };
    res.json(response);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/users - Thêm nhân viên (ADMIN only)
router.post('/', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    console.log(`\n👤 Creating employee: ${email} (role: ${role}, dept: ${department})`);
    
    if (!name || !email) {
      console.log(`❌ Missing required fields: name=${name}, email=${email}`);
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`❌ Email already exists: ${email}`);
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    // Convert department name to ObjectId if provided
    let departmentId = null;
    if (department) {
      console.log(`🏢 Looking up department: ${department}`);
      
      // Try to find department by name
      const dept = await Department.findOne({ name: department });
      if (dept) {
        departmentId = dept._id;
        console.log(`✅ Found department: ${dept.name} (${dept._id})`);
      } else {
        console.log(`⚠️  Department not found: ${department}`);
        // Continue without department if not found
      }
    }

    const passwordHash = await bcrypt.hash(password || 'SecurePass@123', 10);
    console.log(`🔑 Password hashed (bcrypt cost=10)`);

    // ✅ Auto-generate 2FA secret
    const secret = speakeasy.generateSecret({
      name: `SecureTeam (${email})`,
      issuer: 'SecureTeam',
      length: 32
    });
    console.log(`🔐 Generated 2FA secret for ${email}`);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || 'MEMBER',
      department: departmentId || null,
      status: 'ACTIVE',
      avatar: `https://i.pravatar.cc/150?u=${email}`,
      twoFactorEnabled: true,
      twoFactorSecret: secret.base32,
    });
    
    console.log(`✅ Employee created: ${user._id} (${user.email}) with 2FA enabled`);
    
    // Populate department info before response
    await user.populate('department', 'name');
    
    const responseUser = {
      ...user.toObject(),
      id: user._id,
      passwordHash: undefined,
      twoFactorSecret: secret.base32, // ✅ Return 2FA secret to frontend
    };
    res.status(201).json(responseUser);
  } catch (err) {
    console.error(`❌ Create user error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/:id - Cập nhật nhân viên
router.put('/:id', protect, async (req, res) => {
  try {
    // MEMBER chỉ được sửa profile của chính mình
    if (req.user.role === 'MEMBER' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Không có quyền chỉnh sửa nhân viên khác' });
    }

    const { name, email, department, avatar, status, role } = req.body;
    console.log(`\n✏️  Updating employee: ${req.params.id} (email: ${email})`);

    // Convert department name to ObjectId if provided
    let departmentId = undefined;
    if (department) {
      console.log(`🏢 Looking up department: ${department}`);
      
      // Try to find department by name
      const dept = await Department.findOne({ name: department });
      if (dept) {
        departmentId = dept._id;
        console.log(`✅ Found department: ${dept.name} (${dept._id})`);
      } else {
        console.log(`⚠️  Department not found: ${department}`);
      }
    }

    const update = {};
    if (name) update.name = name;
    if (email) update.email = email;
    if (departmentId !== undefined) update.department = departmentId;
    if (avatar) update.avatar = avatar;
    
    // Only ADMIN can change status and role
    if (req.user.role === 'ADMIN') {
      if (status) update.status = status;
      if (role) update.role = role;
    }

    console.log(`📝 Update fields:`, Object.keys(update));

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('department', 'name').select('-passwordHash -twoFactorSecret');
    
    if (!user) {
      console.log(`❌ Employee not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    }

    console.log(`✅ Employee updated: ${user.email}`);
    
    // ✅ Map _id to id for consistency
    const response = {
      ...user.toObject(),
      id: user._id
    };
    res.json(response);
  } catch (err) {
    console.error(`❌ Update user error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id - Xóa nhân viên (ADMIN only)
router.delete('/:id', protect, authorize('ADMIN'), async (req, res) => {
  try {
    console.log(`🗑️  Deleting employee: ${req.params.id}`);
    
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      console.log(`❌ Employee not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    }
    
    console.log(`✅ Employee deleted: ${user.email}`);
    res.json({ message: 'Đã xóa nhân viên' });
  } catch (err) {
    console.error(`❌ Delete user error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/users/:id/setup-2fa ─────────────────────────────
// Admin generates 2FA secret for employee (to send them QR code)
router.post('/:id/setup-2fa', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    console.log(`\n🔐 Setting up 2FA for: ${user.email}`);

    // ✅ Use existing secret if available, don't generate new one
    let secretBase32 = user.twoFactorSecret;
    
    if (!secretBase32) {
      console.log(`⚠️  No existing secret, generating new one`);
      // Generate secret using speakeasy
      const secret = speakeasy.generateSecret({
        name: `SecureTeam (${user.email})`,
        issuer: 'SecureTeam',
        length: 32
      });

      secretBase32 = secret.base32;
      user.twoFactorSecret = secretBase32;
      await user.save();
      console.log(`✅ Generated and saved secret for ${user.email}`);
    } else {
      console.log(`✅ Using existing secret for ${user.email}`);
    }

    // Generate QR code
    const otpauthUrl = `otpauth://totp/SecureTeam%20(${encodeURIComponent(user.email)})?secret=${secretBase32}&issuer=SecureTeam`;
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    console.log(`✅ Generated QR code for ${user.email}`);

    res.json({
      message: '2FA setup ready',
      userId: user._id,
      email: user.email,
      secret: secretBase32,
      qrCode,
      manualEntryKey: secretBase32,
      instructions: 'Share this QR code or manual entry key with the employee. They should scan it in Google Authenticator.'
    });
  } catch (err) {
    console.error(`❌ Setup 2FA error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/users/:id/enable-2fa ────────────────────────────
// Admin enables 2FA for employee after they confirm the code
router.post('/:id/enable-2fa', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: 'Please setup 2FA first' });
    }

    console.log(`\n🔐 Enabling 2FA for: ${user.email}`);

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 4 // Allow 4 time windows (±2 minutes) - same as login verification
    });

    if (!verified) {
      console.log(`❌ Invalid 2FA verification code for ${user.email}`);
      return res.status(400).json({ message: 'Invalid verification code. Make sure your phone time is correct.' });
    }

    console.log(`✅ 2FA verified successfully for ${user.email}`);
    
    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    res.json({ 
      message: '2FA enabled successfully for employee',
      email: user.email
    });
  } catch (err) {
    console.error(`❌ Enable 2FA error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
