const mongoose = require('mongoose');
const { Message, Channel, User } = require('./models');

async function checkData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/secureteam');
    console.log('✓ Connected to MongoDB\n');

    // Get all messages with full details
    const messages = await Message.find()
      .populate('senderId', 'name email')
      .populate('channelId', 'name')
      .lean();

    console.log('═══════════════════════════════════════════');
    console.log('ALL MESSAGES IN DATABASE:');
    console.log('═══════════════════════════════════════════\n');

    messages.forEach((msg, idx) => {
      console.log(`Message ${idx + 1}:`);
      console.log(`  ID: ${msg._id}`);
      console.log(`  Channel: ${msg.channelId?.name || 'N/A'} (${msg.channelId?._id || 'N/A'})`);
      console.log(`  Sender: ${msg.senderId?.name || 'Unknown'} (${msg.senderId?._id || msg.senderId || 'N/A'})`);
      console.log(`  Text: ${msg.text?.substring(0, 50) || 'N/A'}...`);
      console.log(`  Attachments: ${msg.attachments?.length || 0}`);
      if (msg.attachments?.length) {
        msg.attachments.forEach((att, i) => {
          console.log(`    ${i + 1}. ${att.type}: ${att.url}`);
        });
      }
      console.log(`  ReplyTo: ${msg.replyTo ? 'Yes' : 'No'}`);
      console.log(`  CreatedAt: ${new Date(msg.createdAt).toLocaleString()}`);
      console.log();
    });

    console.log('═══════════════════════════════════════════');
    console.log('SUMMARY:');
    console.log('═══════════════════════════════════════════');
    console.log(`Total Messages: ${messages.length}`);
    console.log(`With Attachments: ${messages.filter(m => m.attachments?.length).length}`);
    console.log(`With Replies: ${messages.filter(m => m.replyTo).length}`);

    // Check if senderId is being populated
    const unpopulated = messages.filter(m => typeof m.senderId === 'string');
    if (unpopulated.length > 0) {
      console.log(`\n⚠️  WARNING: ${unpopulated.length} messages have unpopulated senderId!`);
    }

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkData();
