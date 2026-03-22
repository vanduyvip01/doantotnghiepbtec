require('dotenv').config();
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('✓ Connected to MongoDB');
}).catch(err => {
  console.error('✗ MongoDB error:', err.message);
  process.exit(1);
});

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  passwordHash: String,
  role: String,
  department: mongoose.Schema.Types.ObjectId,
  status: String,
  avatar: String,
  twoFactorEnabled: { type: Boolean, default: true },
  twoFactorSecret: String,
  lastLogin: Date,
  lastIpAddress: String,
  lastDevice: String,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const enable = async () => {
  try {
    // Generate 2FA secret
    const secret = speakeasy.generateSecret({
      name: 'SecureTeam (admin@secureteam.com)',
      issuer: 'SecureTeam',
      length: 32
    });

    // Generate QR Code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Update admin user
    const admin = await User.findOneAndUpdate(
      { email: 'admin@secureteam.com' },
      { 
        twoFactorEnabled: true,
        twoFactorSecret: secret.base32
      },
      { new: true }
    );
    
    if (admin) {
      console.log('\n✅ 2FA bật thành công cho admin@secureteam.com');
      console.log('───────────────────────────────────────────');
      console.log('📱 2FA Secret Key (Base32):');
      console.log(`   ${secret.base32}`);
      console.log('\n🔑 Manual Entry Key:');
      console.log(`   ${secret.base32}`);
      console.log('\n📲 QR Code URL:');
      console.log(`   ${secret.otpauth_url}`);
      console.log('\n💾 QR Code (Data URL):');
      console.log(`   ${qrCode.substring(0, 100)}...`);
      console.log('\n📋 Hướng dẫn:');
      console.log('   1. Mở Google Authenticator hoặc app tương tự');
      console.log('   2. Scan QR Code hoặc nhập manual entry key');
      console.log('   3. Lưu lại secret key ở nơi an toàn');
      console.log('───────────────────────────────────────────\n');
    } else {
      console.log('❌ Admin user not found');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
};

enable();
