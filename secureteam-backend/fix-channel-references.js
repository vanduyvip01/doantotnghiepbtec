const mongoose = require('mongoose');

async function fixMessages() {
  try {
    await mongoose.connect('mongodb://localhost:27017/secureteam');
    const { Message } = require('./models');

    console.log('🔧 Fixing message channel references...\n');

    // Mapping cũ → mới
    const channelMapping = {
      '660000000000000000000701': '69cb6a12f7f6dd00b2c52115', // general → General
      '660000000000000000000702': '69cb6a12f7f6dd00b2c5211b'  // engineering → Engineering
    };

    // Update messages
    let fixed = 0;
    for (const [oldId, newId] of Object.entries(channelMapping)) {
      const result = await Message.updateMany(
        { channelId: oldId },
        { channelId: newId }
      );
      
      console.log(`✅ Updated ${result.modifiedCount} messages`);
      console.log(`   From: ${oldId}`);
      console.log(`   To:   ${newId}\n`);
      
      fixed += result.modifiedCount;
    }

    console.log('═══════════════════════════════════════════');
    console.log(`✅ Fixed ${fixed} messages total!\n`);

    // Verify
    console.log('Verifying...\n');
    const allMessages = await Message.find({}, { channelId: 1, text: 1, senderId: 1 }).populate('senderId', 'name');
    
    const byChannel = {};
    allMessages.forEach(msg => {
      const ch = msg.channelId?.toString() || 'null';
      if (!byChannel[ch]) byChannel[ch] = [];
      byChannel[ch].push(msg);
    });

    console.log('Messages by channel:');
    Object.entries(byChannel).forEach(([chId, msgs]) => {
      console.log(`\n  Channel ${chId}: ${msgs.length} messages`);
      msgs.slice(0, 3).forEach(m => {
        console.log(`    - ${m.senderId?.name}: "${m.text.substring(0, 40)}..."`);
      });
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixMessages();
