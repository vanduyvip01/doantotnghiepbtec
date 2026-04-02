/**
 * Test script to verify message format from API
 * Run: node test-message-format.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Load models
const { Message, Channel, User } = require('./models');

async function testMessageFormat() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secureteam');
    console.log('✅ Connected to MongoDB');
    
    // Get a channel with messages
    const channels = await Channel.find().limit(1);
    if (channels.length === 0) {
      console.log('❌ No channels found');
      return;
    }
    
    const channelId = channels[0]._id;
    console.log(`\n📌 Testing channel: ${channelId}`);
    
    // Fetch messages the way API does
    const messages = await Message.find({ channelId, isDeleted: false })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: 1 })
      .limit(5);
    
    console.log(`\n📊 Found ${messages.length} messages\n`);
    
    if (messages.length === 0) {
      console.log('⚠️  No messages in channel');
      return;
    }
    
    // Format like API does
    const formattedMessages = messages.map(msg => {
      const msgObj = msg.toObject();
      return {
        ...msgObj,
        senderId: msgObj.senderId?._id?.toString() || msgObj.senderId,
        senderName: msgObj.senderId?.name || 'Unknown',
        senderAvatar: msgObj.senderId?.avatar || '',
      };
    });
    
    // Display first message for inspection
    formattedMessages.forEach((msg, idx) => {
      console.log(`\n✅ Message ${idx + 1}:`);
      console.log(`   senderId (string): ${msg.senderId}`);
      console.log(`   senderName: ${msg.senderName}`);
      console.log(`   senderAvatar: ${msg.senderAvatar || '(empty)'}`);
      console.log(`   text: ${msg.text?.substring(0, 50) || '(no text)'}`);
      console.log(`   attachments: ${msg.attachments?.length || 0}`);
    });
    
    console.log('\n✅ Format test completed!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

testMessageFormat();
