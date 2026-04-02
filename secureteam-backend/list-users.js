const mongoose = require('mongoose');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/secureteam');
    console.log('✓ Connected to MongoDB\n');

    const User = require('./models').User;
    const users = await User.find({}, { name: 1, email: 1, passwordHash: 1, twoFactorEnabled: 1, twoFactorSecret: 1, status: 1 });

    console.log('═══════════════════════════════════════════');
    console.log('ALL USERS IN DATABASE:');
    console.log('═══════════════════════════════════════════\n');

    users.forEach((user, idx) => {
      console.log(`User ${idx + 1}:`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  2FA Enabled: ${user.twoFactorEnabled}`);
      console.log(`  Password Hash: ${user.passwordHash ? 'SET' : 'NOT SET'}`);
      console.log();
    });

    console.log('═══════════════════════════════════════════');
    console.log('To login for testing, use:');
    console.log('  Email: admin@secureteam.com');
    console.log('  Password: (check seed-once.js)');
    console.log('═══════════════════════════════════════════');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkUsers();
