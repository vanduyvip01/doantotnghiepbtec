require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models');

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secureteam');
    console.log('\n✓ Connected to MongoDB\n');

    const users = await User.find({}).select('_id id name email role').limit(20);
    
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Found ${users.length} users:`);
    console.log('═══════════════════════════════════════════\n');
    
    users.forEach((u, i) => {
      console.log(`${i+1}. ${u.name}`);
      console.log(`   ID: ${u._id}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   Role: ${u.role}`);
      console.log();
    });

    // Test which ID admin would have
    const admin = users.find(u => u.role === 'ADMIN');
    const pm =  users.find(u => u.role === 'PM');
    const member = users.find(u => u.role === 'MEMBER');
    
    console.log('═══════════════════════════════════════════');
    console.log('Quick IDs:');
    console.log('═══════════════════════════════════════════');
    if (admin) console.log(`Admin: ${admin._id}`);
    if (pm) console.log(`PM: ${pm._id}`);
    if (member) console.log(`Member: ${member._id}`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

checkUsers();
