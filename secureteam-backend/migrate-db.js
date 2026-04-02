require('dotenv').config();
const mongoose = require('mongoose');

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Add attachment field to Messages if not exists
    console.log('\n🔧 Migrating Message collection...');
    
    const messageResult = await db.collection('messages').updateMany(
      { attachment: { $exists: false } },
      { $set: { attachment: null } }
    );
    
    console.log(`✅ Updated ${messageResult.modifiedCount} messages with attachment field`);

    // 2. Ensure indexes
    console.log('\n📌 Creating indexes...');
    
    // Messages indexes
    await db.collection('messages').createIndex({ channelId: 1 });
    await db.collection('messages').createIndex({ senderId: 1 });
    await db.collection('messages').createIndex({ receiverId: 1 });
    await db.collection('messages').createIndex({ createdAt: -1 });
    
    console.log('✅ Indexes created');

    // 3. Show collection info
    console.log('\n📊 Collection Info:');
    
    const messageCount = await db.collection('messages').countDocuments();
    const channelCount = await db.collection('channels').countDocuments();
    const userCount = await db.collection('users').countDocuments();
    
    console.log(`  • Messages: ${messageCount}`);
    console.log(`  • Channels: ${channelCount}`);
    console.log(`  • Users: ${userCount}`);

    // 4. Sample message structure
    console.log('\n📋 Sample message structure:');
    const sampleMsg = await db.collection('messages').findOne();
    if (sampleMsg) {
      console.log(JSON.stringify(sampleMsg, null, 2));
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
};

migrate();
