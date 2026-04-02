require('dotenv').config();
const mongoose = require('mongoose');
const { Channel, User } = require('./models');

const seedChannels = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Get all users
    const users = await User.find().limit(10);
    if (users.length === 0) {
      console.log('❌ No users found. Please create users first.');
      process.exit(1);
    }

    console.log(`📊 Found ${users.length} users`);

    // Clear existing channels (optional - comment out if you want to keep existing)
    // await Channel.deleteMany({});
    // console.log('🗑️  Cleared existing channels');

    // Create channels
    const channels = [
      {
        name: 'General',
        description: 'Thảo luận chung về công ty',
        createdBy: users[0]._id,
        members: users.map(u => u._id),
        isPrivate: false
      },
      {
        name: 'Announcements',
        description: 'Thông báo từ quản lý',
        createdBy: users[0]._id,
        members: users.map(u => u._id),
        isPrivate: false
      },
      {
        name: 'Engineering',
        description: 'Team Engineering',
        createdBy: users[0]._id,
        members: users.slice(0, Math.ceil(users.length / 2)).map(u => u._id),
        isPrivate: false
      },
      {
        name: 'Sales',
        description: 'Team Sales',
        createdBy: users[0]._id,
        members: users.slice(Math.ceil(users.length / 2)).map(u => u._id),
        isPrivate: false
      },
      {
        name: 'Random',
        description: 'Chuyện xôi ngoài',
        createdBy: users[0]._id,
        members: users.map(u => u._id),
        isPrivate: false
      }
    ];

    // Check if channels already exist
    for (const channelData of channels) {
      const existing = await Channel.findOne({ name: channelData.name });
      if (!existing) {
        await Channel.create(channelData);
        console.log(`✅ Created channel: ${channelData.name}`);
      } else {
        console.log(`⏭️  Channel already exists: ${channelData.name}`);
      }
    }

    // List all channels
    const allChannels = await Channel.find().populate('createdBy', 'name email').populate('members', 'name email');
    console.log(`\n📌 Total channels: ${allChannels.length}`);
    allChannels.forEach(ch => {
      const creatorName = ch.createdBy?.name || 'Unknown';
      console.log(`  • ${ch.name} (${ch.members?.length || 0} members) - Created by ${creatorName}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

seedChannels();
