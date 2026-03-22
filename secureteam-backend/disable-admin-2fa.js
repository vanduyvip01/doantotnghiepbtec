require('dotenv').config();
const mongoose = require('mongoose');

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

const disable = async () => {
  try {
    const admin = await User.findOneAndUpdate(
      { email: 'admin@secureteam.com' },
      { twoFactorEnabled: false, twoFactorSecret: null },
      { new: true }
    );
    
    if (admin) {
      console.log('✅ 2FA disabled for admin@secureteam.com');
      console.log('   Login: admin@secureteam.com / SecurePass@123');
      console.log('   No 2FA required');
    } else {
      console.log('❌ Admin user not found');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
};

disable();
