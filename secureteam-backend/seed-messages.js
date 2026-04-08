require('dotenv').config();
const mongoose = require('mongoose');
const { Channel, Message, User } = require('./models');

const seedMessages = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Get channels and users
    const channels = await Channel.find().limit(10);
    const users = await User.find().limit(10);

    if (channels.length === 0) {
      console.log('❌ No channels found. Run seed-channels.js first.');
      process.exit(1);
    }

    if (users.length === 0) {
      console.log('❌ No users found. Run seed-users.js first.');
      process.exit(1);
    }

    console.log(`📊 Found ${channels.length} channels and ${users.length} users`);

    // Sample messages for each channel
    const sampleMessages = [
      'Hello everyone! 👋',
      'Hôm nay công việc thế nào?',
      'Ai hoàn thành task chưa?',
      'Meeting lúc 2h PM nhé',
      'Cập nhật tiến độ: 75% hoàn thành',
      'Tốt! Tiếp tục cố gắng',
      '😊 You did great job',
      'Thank you all for supporting',
      'Deploy thành công 🎉',
      'Bug fix đã xong',
      'Review code tại PR #123',
      'Sẽ check lại để confirm'
    ];

    let messageCount = 0;

    // Create messages for each channel
    for (const channel of channels) {
      console.log(`\n📌 Adding messages to channel: ${channel.name}`);
      
      for (let i = 0; i < 5; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
        
        const msg = await Message.create({
          channelId: channel._id,
          senderId: randomUser._id,
          text: randomMessage,
          reactions: [],
          isDeleted: false,
          createdAt: new Date(Date.now() - Math.random() * 86400000)
        });
        
        messageCount++;
        console.log(`  ✅ Message ${i + 1}: "${randomMessage}" from ${randomUser.name}`);
      }
    }

    // Create some direct messages
    console.log('\n💌 Adding direct messages...');
    for (let i = 0; i < 3; i++) {
      const user1 = users[i];
      const user2 = users[(i + 1) % users.length];
      
      const msg = await Message.create({
        senderId: user1._id,
        receiverId: user2._id,
        text: `Hi ${user2.name}! How are you?`,
        reactions: [],
        isDeleted: false
      });
      
      messageCount++;
      console.log(`  ✅ DM: ${user1.name} → ${user2.name}`);
    }

    console.log(`\n✅ Total messages created: ${messageCount}`);

    // Show summary
    const totalMessages = await Message.countDocuments();
    const channelMessages = await Message.countDocuments({ channelId: { $exists: true, $ne: null } });
    const dmMessages = await Message.countDocuments({ receiverId: { $exists: true, $ne: null } });

    console.log(`\n📊 Summary:`);
    console.log(`  • Total messages: ${totalMessages}`);
    console.log(`  • Channel messages: ${channelMessages}`);
    console.log(`  • DM messages: ${dmMessages}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

seedMessages();
