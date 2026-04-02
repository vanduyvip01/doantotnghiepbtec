const mongoose = require('mongoose');

async function checkChannels() {
  try {
    await mongoose.connect('mongodb://localhost:27017/secureteam');
    const { Channel, Message, User } = require('./models');

    // Get Admin user
    const admin = await User.findOne({ email: 'admin@secureteam.com' });
    console.log('Admin ID:', admin?._id, '\n');

    // Get all channels
    const allChannels = await Channel.find({}, { name: 1, _id: 1, members: 1 });
    console.log('═══════════════════════════════════════════');
    console.log('ALL CHANNELS IN DATABASE:');
    console.log('═══════════════════════════════════════════\n');

    allChannels.forEach(ch => {
      console.log(`Channel: ${ch.name}`);
      console.log(`  ID: ${ch._id}`);
      console.log(`  Members: ${ch.members.length}`);
      console.log();
    });

    // Get all messages with channel info
    const allMessages = await Message.find({}, { _id: 1, channelId: 1, text: 1, senderId: 1 });
    console.log('═══════════════════════════════════════════');
    console.log('ALL MESSAGES IN DATABASE:');
    console.log('═══════════════════════════════════════════\n');

    allMessages.forEach((msg, idx) => {
      console.log(`${idx + 1}. Message in channel: ${msg.channelId}`);
      console.log(`   Text: ${msg.text.substring(0, 40)}...`);
      console.log();
    });

    console.log('═══════════════════════════════════════════');
    console.log('FINDING MATCH:');
    console.log('═══════════════════════════════════════════\n');

    // Check which channels (returned in API) match with message channels
    const apiChannels = ['69cb6a12f7f6dd00b2c52115', '69cb6a12f7f6dd00b2c52118', '69cb6a12f7f6dd00b2c5211b', '69cb6a12f7f6dd00b2c52121'];
    allMessages.forEach(msg => {
      const found = apiChannels.includes(msg.channelId.toString());
      console.log(`Message channel ${msg.channelId} in API channels? ${found ? '✅ YES' : '❌ NO'}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkChannels();
