require('dotenv').config();
const mongoose = require('mongoose');
const { Channel, Message, User } = require('./models');

const testAPI = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secureteam');
    console.log('\n✓ Connected to MongoDB\n');

    // Test 1: Get all channels
    console.log('═══════════════════════════════════════════');
    console.log('TEST 1: Fetch all channels');
    console.log('═══════════════════════════════════════════');
    const channels = await Channel.find({}).limit(5);
    console.log(`✅ Found ${channels.length} channels:`);
    channels.forEach((ch, i) => {
      console.log(`  ${i+1}. ${ch.name} (id: ${ch._id})`);
    });

    // Test 2: Get messages from first channel
    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 2: Fetch messages from first channel');
    console.log('═══════════════════════════════════════════');
    if (channels.length > 0) {
      const firstChannelId = channels[0]._id;
      console.log(`Querying messages for channel: ${firstChannelId}\n`);
      
      const messages = await Message.find({ 
        channelId: firstChannelId,
        isDeleted: false 
      }).populate('senderId', 'name avatar').limit(10);
      
      console.log(`✅ Found ${messages.length} messages:\n`);
      messages.forEach((msg, i) => {
        console.log(`  Message ${i+1}:`);
        console.log(`    From: ${msg.senderId?.name || 'Unknown'}`);
        console.log(`    Text: ${msg.text?.substring(0, 50)}${msg.text?.length > 50 ? '...' : ''}`);
        console.log(`    Attachments: ${msg.attachments?.length || 0}`);
        if (msg.attachments && msg.attachments.length > 0) {
          msg.attachments.forEach((att, j) => {
            console.log(`      ${j+1}. ${att.type}: ${att.name}`);
          });
        }
        console.log();
      });
    }

    // Test 3: Database stats
    console.log('═══════════════════════════════════════════');
    console.log('TEST 3: Database Statistics');
    console.log('═══════════════════════════════════════════');
    const stats = {
      channels: await Channel.countDocuments(),
      messages: await Message.countDocuments(),
      users: await User.countDocuments(),
      messagesWithAttachments: await Message.countDocuments({ 'attachments.0': { $exists: true } }),
      messagesWithReply: await Message.countDocuments({ 'replyTo.messageId': { $ne: null } }),
    };
    
    console.log(`Channels: ${stats.channels}`);
    console.log(`Messages: ${stats.messages}`);
    console.log(`Users: ${stats.users}`);
    console.log(`Messages with attachments: ${stats.messagesWithAttachments}`);
    console.log(`Messages with replies: ${stats.messagesWithReply}`);

    console.log('\n✅ All tests completed!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
};

testAPI();
