const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User, SecurityLog, Notification } = require('../models');
const { protect } = require('../middleware/auth');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── GET /api/auth/debug ──────────────────────────────────────
router.get('/debug', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminUser = await User.findOne({ email: 'admin@secureteam.com' });
    const allUsers = await User.find({}, { name: 1, email: 1, role: 1, twoFactorSecret: 1, twoFactorEnabled: 1 });
    res.json({
      totalUsers,
      adminUserExists: !!adminUser,
      adminUser: adminUser ? {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        passwordHashLength: adminUser.passwordHash?.length,
        role: adminUser.role,
        status: adminUser.status,
      } : null,
      allUsers: allUsers.map(u => ({
        name: u.name,
        email: u.email,
        role: u.role,
        twoFactorEnabled: u.twoFactorEnabled,
        twoFactorSecret: u.twoFactorSecret || 'NOT SET',
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/auth/debug-2fa-code/:email ──────────────────────
// Debug endpoint to get current valid 2FA code for a user
router.get('/debug-2fa-code/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: '2FA not configured for this user' });
    }

    const currentCode = speakeasy.totp({
      secret: user.twoFactorSecret,
      encoding: 'base32'
    });

    res.json({
      email: user.email,
      name: user.name,
      currentCode,
      secret: user.twoFactorSecret,
      expiresAt: new Date(Date.now() + 30000), // Expires in ~30 seconds
      message: '⏱️  Code refreshes every 30 seconds. Copy & paste it immediately!'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/create-test-user ──────────────────────────
router.post('/create-test-user', async (req, res) => {
  try {
    const { email = 'testadmin@secureteam.com', password = 'TestPass@123', name = 'Test Admin' } = req.body;
    
    console.log(`\n🆕 Creating new user: ${email}`);
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    console.log(`🔑 Generated hash: ${passwordHash}`);

    // Generate 2FA secret
    const secret = speakeasy.generateSecret({
      name: `SecureTeam (${email})`,
      issuer: 'SecureTeam',
      length: 32
    });
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Create user with 2FA secret
    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      department: null,
      twoFactorEnabled: true,
      twoFactorSecret: secret.base32,
    });

    console.log(`✅ User created: ${newUser._id}`);
    console.log(`🔐 2FA Secret: ${secret.base32}`);

    res.json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        passwordHash: passwordHash,
      },
      testCredentials: {
        email,
        password,
        note: 'Scan QR code with Google Authenticator'
      },
      twoFA: {
        qrCode,
        secret: secret.base32,
        manualEntryKey: secret.base32,
        note: 'Add this account to Google Authenticator to get 6-digit codes'
      }
    });
  } catch (err) {
    console.error(`❌ Create user error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/seed-users ────────────────────────────────
// Tạo 3 test users mới (admin, pm, member) với 2FA - KHÔNG XÓA USERS CŨ
router.post('/seed-users', async (req, res) => {
  try {
    console.log(`\n🌱 Seeding test users (WITHOUT deleting existing users)...`);

    const password = 'TestPass@123';
    const passwordHash = await bcrypt.hash(password, 10);

    const usersData = [
      {
        name: 'Admin User',
        email: 'admin@secureteam.com',
        role: 'ADMIN',
        secretKey: 'JBSWY3DPEHPK3PXP',
      },
      {
        name: 'Project Manager',
        email: 'pm@secureteam.com',
        role: 'PM',
        secretKey: 'JBSWY3DPEHPK3PXQ',
      },
      {
        name: 'Team Member',
        email: 'member@secureteam.com',
        role: 'MEMBER',
        secretKey: 'JBSWY3DPEHPK3PXR',
      },
    ];

    const createdUsers = [];
    const skippedUsers = [];

    for (const userData of usersData) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⏭️  Skipped: ${userData.email} (already exists)`);
        skippedUsers.push({
          email: userData.email,
          status: 'already_exists'
        });
        continue;
      }

      const newUser = await User.create({
        name: userData.name,
        email: userData.email,
        passwordHash,
        role: userData.role,
        status: 'ACTIVE',
        twoFactorEnabled: true,
        twoFactorSecret: userData.secretKey,
        department: null,
      });

      createdUsers.push({
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        password,
        twoFactorSecret: userData.secretKey,
      });

      console.log(`✅ Created: ${newUser.email} (${newUser.role})`);
    }

    res.json({
      message: `Seeding complete! Created ${createdUsers.length}, Skipped ${skippedUsers.length}`,
      created: createdUsers,
      skipped: skippedUsers,
      loginInfo: {
        password: 'TestPass@123',
        instruction: 'Use email + password to login, then enter 6-digit code from Google Authenticator',
        twoFASetup: 'Add secret keys to Google Authenticator app'
      }
    });
  } catch (err) {
    console.error(`❌ Seed users error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/force-delete-all ────────────────────────────────
// ⚠️ DANGER: Xóa toàn bộ users - CHỈ DÙNG KHI THỰC SỰ CẦN RESET
router.post('/force-delete-all', async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'DELETE_ALL_USERS') {
      return res.status(400).json({ message: '⚠️ Confirmation code không đúng. Để xóa tất cả, gửi confirm: "DELETE_ALL_USERS"' });
    }

    console.log(`\n🗑️  FORCE DELETING ALL USERS...`);
    const result = await User.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} users`);

    res.json({
      message: `✅ Deleted ${result.deletedCount} users. Database is now clean.`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error(`❌ Force delete error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/delete-user ────────────────────────────────
// Xóa user cụ thể theo email - dùng để fix tài khoản bị lỗi
router.post('/delete-user', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    console.log(`\n🗑️  Deleting user: ${email}`);
    const result = await User.findOneAndDelete({ email });
    
    if (!result) {
      return res.status(404).json({ message: `User ${email} not found` });
    }

    console.log(`✅ Deleted user: ${email}`);
    res.json({
      message: `✅ User ${email} deleted successfully`,
      deletedUser: result.email
    });
  } catch (err) {
    console.error(`❌ Delete user error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────
// Cập nhật password của user theo email
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and newPassword are required' });
    }

    console.log(`\n🔐 Resetting password for: ${email}`);
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: `User ${email} not found` });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();

    console.log(`✅ Password reset for: ${email}`);
    res.json({
      message: `✅ Password reset successfully for ${email}`,
      email: email
    });
  } catch (err) {
    console.error(`❌ Reset password error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const device = req.headers['user-agent'] || 'Unknown';

    console.log(`🔐 Login attempt: ${email}`);
    
    const user = await User.findOne({ email }).populate('department', 'name');
    console.log(`👤 User found: ${user ? 'YES' : 'NO'}`);
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      await SecurityLog.create({ userId: null, userName: email, action: 'Login', ipAddress: ip, device, status: 'FAILED', meta: { reason: 'User not found' } });
      
      // Create notification for all admins about failed login
      const admins = await User.find({ role: 'ADMIN' });
      for (const admin of admins) {
        await Notification.create({
          recipientId: admin._id,
          type: 'LOGIN_FAILED',
          title: '❌ Failed Login Attempt',
          message: `Failed login attempt for email: ${email}`,
          relatedData: { email, ip, device, reason: 'User not found' },
          isRead: false
        });
      }
      
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    console.log(`🔑 Password hash in DB: ${user.passwordHash?.substring(0, 30)}...`);
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log(`✓ Password valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log(`❌ Password mismatch for ${email}`);
      await SecurityLog.create({ userId: user?._id || null, userName: email, action: 'Login', ipAddress: ip, device, status: 'FAILED', meta: { reason: 'Invalid password' } });
      
      // Create notification for all admins about failed login
      const admins = await User.find({ role: 'ADMIN' });
      for (const admin of admins) {
        await Notification.create({
          recipientId: admin._id,
          type: 'LOGIN_FAILED',
          title: '❌ Failed Login Attempt',
          message: `Failed login attempt for: ${user.name}`,
          relatedData: { userId: user._id, email, ip, device, reason: 'Invalid password' },
          isRead: false
        });
      }
      
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    if (user.status !== 'ACTIVE') {
      console.log(`⚠️ User status: ${user.status}`);
      return res.status(403).json({ message: `Tài khoản đang ${user.status}` });
    }

    // ✅ CHECK: Nếu 2FA disabled → login thẳng, không cần tempToken
    if (!user.twoFactorEnabled) {
      console.log(`✅ Login success (2FA disabled, going directly to dashboard)`);
      await SecurityLog.create({ userId: user._id, userName: user.name, action: 'Login', ipAddress: ip, device, status: 'SUCCESS' });
      
      return res.json({
        requires2FA: false,
        token: signToken(user),
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email, 
          role: user.role,
          twoFactorEnabled: false 
        }
      });
    }

    // ✅ NẾU 2FA ENABLED: Trả về tempToken để xác thực bước 2
    const tempToken = jwt.sign({ id: user._id, step: '2fa' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    console.log(`✅ Login success, 2FA required (user has 2FA enabled)`);
    res.json({ requires2FA: true, tempToken, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(`❌ Login error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    
    // Validate input
    if (!tempToken) {
      return res.status(400).json({ message: 'tempToken is required' });
    }
    if (!code) {
      return res.status(400).json({ message: 'Verification code is required' });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Code must be exactly 6 digits' });
    }

    let payload;
    try {
      payload = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      console.error(`❌ Token verification error: ${err.message}`);
      return res.status(401).json({ message: 'Token tạm thời không hợp lệ hoặc đã hết hạn' });
    }
    
    if (payload.step !== '2fa') {
      return res.status(401).json({ message: 'Token không hợp lệ. Token phải là 2FA token.' });
    }

    const ip = req.ip || 'unknown';
    const device = req.headers['user-agent'] || 'Unknown';

    const user = await User.findById(payload.id).populate('department', 'name');
    if (!user) {
      console.log(`❌ User not found for ID: ${payload.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`\n🔐 Verifying 2FA code for: ${user.email}`);
    console.log(`   📱 Code entered: ${code}`);
    console.log(`   🔒 2FA enabled: ${user.twoFactorEnabled}`);
    console.log(`   🔑 Secret exists: ${!!user.twoFactorSecret}`);

    if (!user.twoFactorSecret) {
      console.log(`❌ No 2FA secret configured for ${user.email}`);
      return res.status(400).json({ message: '2FA not configured for this account' });
    }

    // Generate current valid codes for debugging
    const currentCode = speakeasy.totp({
      secret: user.twoFactorSecret,
      encoding: 'base32'
    });
    console.log(`   ✅ Current valid code at this moment: ${currentCode}`);

    // Generate codes for 3 time windows to show what might be valid
    const codes = [];
    for (let i = -2; i <= 2; i++) {
      const windowCode = speakeasy.totp({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        time: Math.floor(Date.now() / 1000) + (i * 30)
      });
      codes.push({window: i, code: windowCode});
    }
    console.log(`   📊 Valid codes in ±2 windows: ${codes.map(c => c.code).join(', ')}`);

    // Verify TOTP code using speakeasy
    // window: 4 allows up to ±4 time windows (±2 minutes) instead of ±1 minute
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 4 // Allow 4 time windows (±2 minutes) for more tolerance
    });

    if (!verified) {
      console.log(`❌ 2FA code verification FAILED for ${user.email}`);
      console.log(`   🔍 Entered code: "${code}"`);
      console.log(`   🔍 Current window code: "${currentCode}"`);
      console.log(`   ⚠️  Code is not in valid time windows`);
      await SecurityLog.create({ 
        userId: user._id, 
        userName: user.name, 
        action: '2FA Verify', 
        ipAddress: ip, 
        device, 
        status: 'FAILED', 
        meta: { 
          reason: 'Invalid TOTP code', 
          enteredCode: code, 
          currentValid: currentCode,
          validCodes: codes.map(c => c.code)
        } 
      });
      
      // Create notification for all admins about failed 2FA
      const admins = await User.find({ role: 'ADMIN' });
      for (const admin of admins) {
        await Notification.create({
          recipientId: admin._id,
          type: 'LOGIN_FAILED',
          title: '❌ Failed 2FA Verification',
          message: `Failed 2FA verification attempt for: ${user.name}`,
          relatedData: { userId: user._id, email: user.email, ip, device, reason: 'Invalid TOTP code' },
          isRead: false
        });
      }
      
      return res.status(401).json({ 
        message: 'Mã xác thực không đúng hoặc đã hết hạn (hết cách > 2 phút). Kiểm tra thời gian điện thoại và thử lại ngay lập tức.',
        debug: {
          entered: code,
          expected: currentCode,
          timeSync: 'Hãy chắc chắn thời gian điện thoại đồng bộ với máy chủ'
        }
      });
    }

    console.log(`✅ 2FA verification SUCCESS for ${user.email}!`);
    
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date(), lastIpAddress: ip, lastDevice: device });
    await SecurityLog.create({ userId: user._id, userName: user.name, action: 'Login', ipAddress: ip, device, status: 'SUCCESS' });

    res.json({
      token: signToken(user),
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        department: user.department?.name || null, 
        avatar: user.avatar, 
        status: user.status,
        twoFactorEnabled: user.twoFactorEnabled 
      },
    });
  } catch (err) {
    console.error(`❌ Verify2FA error: ${err.message}`);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// ── POST /api/auth/setup-2fa ────────────────────────────────
router.post('/setup-2fa', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    console.log(`\n🔐 Setting up 2FA for: ${user.email}`);

    // Generate secret using speakeasy
    const secret = speakeasy.generateSecret({
      name: `SecureTeam (${user.email})`,
      issuer: 'SecureTeam',
      length: 32
    });

    console.log(`✅ Generated secret for ${user.email}`);

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    console.log(`✅ Generated QR code for ${user.email}`);

    // Store secret (but don't enable yet - user must verify first)
    user.twoFactorSecret = secret.base32;
    await user.save();

    res.json({
      message: '2FA setup initiated',
      secret: secret.base32,
      qrCode,
      manualEntryKey: secret.base32,
      warning: 'Please save the code in case you lose the QR code'
    });
  } catch (err) {
    console.error(`❌ Setup 2FA error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/verify-2fa-setup ────────────────────────────
router.post('/verify-2fa-setup', protect, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user.id);

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: 'Please setup 2FA first' });
    }

    console.log(`\n🔐 Verifying 2FA setup for: ${user.email}`);

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      console.log(`❌ Invalid 2FA verification code`);
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    console.log(`✅ 2FA verified successfully`);
    
    // Mark 2FA as enabled
    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: '2FA enabled successfully' });
  } catch (err) {
    console.error(`❌ Verify 2FA setup error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('department', 'name').select('-passwordHash -twoFactorSecret');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', protect, async (req, res) => {
  await SecurityLog.create({ userId: req.user.id, userName: req.user.email, action: 'Logout', ipAddress: req.ip || 'unknown', device: req.headers['user-agent'] || 'Unknown', status: 'SUCCESS' });
  res.json({ message: 'Đăng xuất thành công' });
});

// ── PUT /api/auth/change-password ────────────────────────────
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    await SecurityLog.create({ userId: user._id, userName: user.name, action: 'Password Change', ipAddress: req.ip || 'unknown', device: req.headers['user-agent'] || 'Unknown', status: 'SUCCESS' });
    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/fix-passwords ─────────────────────────────
// Tạo password hash chính xác và cập nhật tất cả test users
router.post('/fix-passwords', async (req, res) => {
  try {
    const password = 'SecurePass@123';
    const testEmails = [
      'admin@secureteam.com',
      'pm@secureteam.com',
      'member@secureteam.com',
      'minh@secureteam.com',
      'linh@secureteam.com'
    ];

    console.log(`\n🔧 Fixing passwords for test accounts...`);
    
    // Generate correct hash
    const correctHash = await bcrypt.hash(password, 10);
    console.log(`🔑 Generated correct hash: ${correctHash}`);

    // Update all test users
    const result = await User.updateMany(
      { email: { $in: testEmails } },
      { passwordHash: correctHash }
    );

    console.log(`✅ Updated ${result.modifiedCount} users`);

    res.json({
      message: 'Passwords fixed successfully',
      updated: result.modifiedCount,
      correctHash,
      testCredentials: {
        password: 'SecurePass@123',
        twoFactorCode: '123456',
        testAccounts: testEmails
      }
    });
  } catch (err) {
    console.error(`❌ Fix passwords error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/verify-hash ───────────────────────────────
// Test bcrypt hash verification
router.post('/verify-hash', async (req, res) => {
  try {
    const { password, hash } = req.body;
    
    if (!password || !hash) {
      return res.status(400).json({ message: 'Cần cả password và hash' });
    }

    const isValid = await bcrypt.compare(password, hash);
    
    res.json({
      password,
      hash: hash.substring(0, 30) + '...',
      isValid,
      message: isValid ? 'Hash khớp ✅' : 'Hash không khớp ❌'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/auth/test-accounts ─────────────────────────────
// List all test accounts with their hash status
router.get('/test-accounts', async (req, res) => {
  try {
    const testEmails = [
      'admin@secureteam.com',
      'pm@secureteam.com',
      'member@secureteam.com',
      'minh@secureteam.com',
      'linh@secureteam.com'
    ];

    const accounts = await User.find({ email: { $in: testEmails } }).select('email name role passwordHash');
    
    // Test password verification
    const testPassword = 'SecurePass@123';
    const accountsWithVerification = Promise.all(
      accounts.map(async (acc) => ({
        email: acc.email,
        name: acc.name,
        role: acc.role,
        hashLength: acc.passwordHash?.length,
        passwordMatches: await bcrypt.compare(testPassword, acc.passwordHash)
      }))
    );

    res.json({
      testPassword,
      twoFactorCode: '123456',
      accounts: await accountsWithVerification
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
