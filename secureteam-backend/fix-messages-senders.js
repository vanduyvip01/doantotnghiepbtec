require('dotenv').config();
const mongoose = require('mongoose');
const { Message, User } = require('./models');

const migrateMessages = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secureteam');
    console.log('\n✓ Connected to MongoDB\n');

    // Get real user IDs from database
    const admin = await User.findOne({ role: 'ADMIN' });
    const pm = await User.findOne({ role: 'PM' });
    const members = await User.find({ role: 'MEMBER' }).limit(3);

    if (!admin || !pm || members.length < 2) {
      throw new Error('Not enough users in database');
    }

    const adminId = admin._id;
    const pmId = pm._id;
    const memberId1 = members[0]._id;
    const memberId2 = members[1]._id;

    console.log('Using real user IDs:');
    console.log(`  Admin (${admin.name}): ${adminId}`);
    console.log(`  PM (${pm.name}): ${pmId}`);
    console.log(`  Member1 (${members[0].name}): ${memberId1}`);
    console.log(`  Member2 (${members[1].name}): ${memberId2}\n`);

    // Clear old messages
    const cleared = await Message.deleteMany({});
    console.log(`🗑️  Cleared ${cleared.deletedCount} old messages\n`);

    // Get channels
    const channels = await require('./models').Channel.find({}).limit(3);
    if (channels.length === 0) throw new Error('No channels found');

    const chan1 = channels[0]._id;
    const chan2 = channels.length > 1 ? channels[1]._id : chan1;

    console.log(`📌 Using channels: ${chan1}, ${chan2}\n`);
    console.log('🔧 Creating sample v2 messages with correct sender IDs...\n');

    const sampleMessages = [
      {
        _id: mongoose.Types.ObjectId.createFromHexString('660001000000000000000001'),
        senderId: adminId,
        receiverId: null,
        channelId: chan1,
        text: '✅ Welcome to SecureTeam! Messages v2 with attachments.',
        attachments: [],
        replyTo: null,
        forwardedFrom: null,
        readBy: [{ userId: pmId, readAt: new Date() }],
        reactions: [{ emoji: '👋', users: [pmId] }],
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: mongoose.Types.ObjectId.createFromHexString('660001000000000000000002'),
        senderId: pmId,
        receiverId: null,
        channelId: chan1,
        text: '📊 Important update: New features available',
        attachments: [{
          type: 'IMAGE',
          url: '/uploads/messages/update.png',
          name: 'update.png',
          size: 512000,
          mimeType: 'image/png',
          width: 1280,
          height: 720,
        }],
        replyTo: null,
        forwardedFrom: null,
        readBy: [{ userId: adminId, readAt: new Date() }],
        reactions: [],
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: mongoose.Types.ObjectId.createFromHexString('660001000000000000000003'),
        senderId: memberId1,
        receiverId: null,
        channelId: chan2,
        text: "🎬 Here's the team meeting recording",
        attachments: [{
          type: 'VIDEO',
          url: '/uploads/messages/meeting.mp4',
          name: 'meeting.mp4',
          size: 52428800,
          mimeType: 'video/mp4',
          width: 1920,
          height: 1080,
          duration: 342,
          thumbnail: '/uploads/messages/meeting_thumb.jpg',
        }],
        replyTo: null,
        forwardedFrom: null,
        readBy: [{ userId: pmId, readAt: new Date() }],
        reactions: [{ emoji: '🙏', users: [pmId] }],
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: mongoose.Types.ObjectId.createFromHexString('660001000000000000000004'),
        senderId: memberId2,
        receiverId: null,
        channelId: chan2,
        text: '📄 Documentation with checklist and mockup',
        attachments: [
          {
            type: 'DOCUMENT',
            url: '/uploads/messages/checklist.docx',
            name: 'checklist.docx',
            size: 245760,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
          {
            type: 'IMAGE',
            url: '/uploads/messages/mockup.jpg',
            name: 'mockup.jpg',
            size: 819200,
            mimeType: 'image/jpeg',
            width: 1440,
            height: 900,
          },
        ],
        replyTo: null,
        forwardedFrom: null,
        readBy: [{ userId: memberId1, readAt: new Date() }],
        reactions: [],
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: mongoose.Types.ObjectId.createFromHexString('660001000000000000000005'),
        senderId: memberId1,
        receiverId: null,
        channelId: chan2,
        text: '🎤 Audio note from the stand-up',
        attachments: [{
          type: 'AUDIO',
          url: '/uploads/messages/standup.m4a',
          name: 'standup.m4a',
          size: 3145728,
          mimeType: 'audio/mp4',
          duration: 185,
        }],
        replyTo: null,
        forwardedFrom: null,
        readBy: [{ userId: adminId, readAt: new Date() }],
        reactions: [],
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: mongoose.Types.ObjectId.createFromHexString('660001000000000000000006'),
        senderId: pmId,
        receiverId: memberId1,
        channelId: null,
        text: 'Can you review the updated proposal?',
        attachments: [],
        replyTo: null,
        forwardedFrom: null,
        readBy: [{ userId: memberId1, readAt: new Date() }],
        reactions: [],
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: mongoose.Types.ObjectId.createFromHexString('660001000000000000000007'),
        senderId: memberId1,
        receiverId: pmId,
        channelId: null,
        text: 'Sure! Sending feedback shortly.',
        attachments: [],
        replyTo: {
          messageId: mongoose.Types.ObjectId.createFromHexString('660001000000000000000006'),
          senderId: pmId,
          senderName: pm.name,
          text: 'Can you review the updated proposal?',
        },
        forwardedFrom: null,
        readBy: [{ userId: pmId, readAt: new Date() }],
        reactions: [{ emoji: '👍', users: [pmId] }],
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = await Message.insertMany(sampleMessages);
    console.log(`✅ Inserted ${result.length} messages with CORRECT sender IDs\n`);

    // Verify populate works
    console.log('📊 Verifying message senders:\n');
    const populatedMsgs = await Message.find({}).populate('senderId', 'name').limit(5);
    populatedMsgs.forEach((msg, i) => {
      console.log(`  ${i+1}. From: ${msg.senderId?.name || 'UNKNOWN'} - "${msg.text?.substring(0, 40)}..."`);
    });

    // Stats
    const stats = {
      total: await Message.countDocuments(),
      withAttachments: await Message.countDocuments({ 'attachments.0': { $exists: true } }),
      withReply: await Message.countDocuments({ 'replyTo.messageId': { $ne: null } }),
      dm: await Message.countDocuments({ receiverId: { $ne: null } }),
      channels: await Message.countDocuments({ channelId: { $ne: null } }),
    };

    console.log('\n════════════════════════════════════════════');
    console.log('   ✅ Messages v2 FIXED!');
    console.log('════════════════════════════════════════════');
    console.log(`  Total: ${stats.total}`);
    console.log(`  Channels: ${stats.channels}`);
    console.log(`  DMs: ${stats.dm}`);
    console.log(`  With attachments: ${stats.withAttachments}`);
    console.log(`  With replies: ${stats.withReply}`);
    console.log('════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
};

migrateMessages();
