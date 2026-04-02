require('dotenv').config();
const mongoose = require('mongoose');
const { Message } = require('./models');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secureteam');
    console.log('✓ Connected to MongoDB\n');

    const adminId = mongoose.Types.ObjectId.createFromHexString('660000000000000000000101');
    const pmId = mongoose.Types.ObjectId.createFromHexString('660000000000000000000102');
    const memberId1 = mongoose.Types.ObjectId.createFromHexString('660000000000000000000103');
    const memberId2 = mongoose.Types.ObjectId.createFromHexString('660000000000000000000104');
    const memberId3 = mongoose.Types.ObjectId.createFromHexString('660000000000000000000105');

    const chan1 = mongoose.Types.ObjectId.createFromHexString('660000000000000000000701');
    const chan2 = mongoose.Types.ObjectId.createFromHexString('660000000000000000000702');

    console.log('\n🔧 Creating Messages v2 with attachments, replies, forwards...\n');

    // Clear old messages collection (fresh start for v2 schema)
    const clearedCount = await Message.deleteMany({});
    console.log(`🗑️  Cleared ${clearedCount.deletedCount} old messages\n`);

    // Sample v2 messages
    const messagesData = [
      // #general - Welcome
      {
        _id: mongoose.Types.ObjectId.createFromHexString('660001000000000000000001'),
        senderId: adminId,
        receiverId: null,
        channelId: chan1,
        text: '✅ Welcome to SecureTeam! New messages v2 with attachments, replies, and forwards.',
        attachments: [],
        replyTo: null,
        forwardedFrom: null,
        readBy: [
          { userId: pmId, readAt: new Date() },
          { userId: memberId1, readAt: new Date() },
        ],
        reactions: [{ emoji: '👋', users: [pmId, memberId1] }],
        isDeleted: false,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // #general - With image
      {
        _id: mongoose.Types.ObjectId.createFromHexString('660001000000000000000002'),
        senderId: pmId,
        receiverId: null,
        channelId: chan1,
        text: '🖼️ Team photo and sprint info',
        attachments: [
          {
            type: 'IMAGE',
            url: '/uploads/messages/sprint_banner.png',
            name: 'sprint_banner.png',
            size: 512000,
            mimeType: 'image/png',
            width: 1280,
            height: 720,
          },
        ],
        replyTo: null,
        forwardedFrom: null,
        readBy: [{ userId: adminId, readAt: new Date() }],
        reactions: [{ emoji: '🔥', users: [adminId] }],
        isDeleted: false,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // #general - With video
      {
        _id: mongoose.Types.ObjectId.createFromHexString('660001000000000000000003'),
        senderId: adminId,
        receiverId: null,
        channelId: chan1,
        text: '🎬 Onboarding video for new team members',
        attachments: [
          {
            type: 'VIDEO',
            url: '/uploads/messages/onboarding.mp4',
            name: 'onboarding.mp4',
            size: 52428800,
            mimeType: 'video/mp4',
            width: 1920,
            height: 1080,
            duration: 342,
            thumbnail: '/uploads/messages/onboarding_thumb.jpg',
          },
        ],
        replyTo: null,
        forwardedFrom: null,
        readBy: [{ userId: pmId, readAt: new Date() }],
        reactions: [{ emoji: '🙏', users: [pmId] }],
        isDeleted: false,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // #engineering - Multi-attachment (image + document)
      {
        _id: mongoose.Types.ObjectId.createFromHexString('660001000000000000000004'),
        senderId: memberId1,
        receiverId: null,
        channelId: chan2,
        text: '📊 VPC Architecture and technical report',
        attachments: [
          {
            type: 'IMAGE',
            url: '/uploads/messages/vpc_architecture.png',
            name: 'vpc_architecture.png',
            size: 2097152,
            mimeType: 'image/png',
            width: 2400,
            height: 1600,
          },
          {
            type: 'DOCUMENT',
            url: '/uploads/messages/vpc_report.pdf',
            name: 'vpc_report.pdf',
            size: 1048576,
            mimeType: 'application/pdf',
          },
        ],
        replyTo: null,
        forwardedFrom: null,
        readBy: [{ userId: adminId, readAt: new Date() }],
        reactions: [{ emoji: '⭐', users: [adminId] }],
        isDeleted: false,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // #engineering - Reply with audio
      {
        _id: mongoose.Types.ObjectId.createFromHexString('660001000000000000000005'),
        senderId: memberId2,
        receiverId: null,
        channelId: chan2,
        text: '🎤 Stand-up meeting recording',
        attachments: [
          {
            type: 'AUDIO',
            url: '/uploads/messages/standup.m4a',
            name: 'standup.m4a',
            size: 3145728,
            mimeType: 'audio/mp4',
            duration: 185,
          },
        ],
        replyTo: {
          messageId: mongoose.Types.ObjectId.createFromHexString('660001000000000000000004'),
          senderId: memberId1,
          senderName: 'Alex',
          text: '📊 VPC Architecture and technical report',
        },
        forwardedFrom: null,
        readBy: [{ userId: memberId1, readAt: new Date() }],
        reactions: [],
        isDeleted: false,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // DM - with documents
      {
        _id: mongoose.Types.ObjectId.createFromHexString('660001000000000000000006'),
        senderId: pmId,
        receiverId: memberId1,
        channelId: null,
        text: '📋 Security audit checklist and mockup',
        attachments: [
          {
            type: 'DOCUMENT',
            url: '/uploads/messages/audit_checklist.docx',
            name: 'audit_checklist.docx',
            size: 245760,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
          {
            type: 'IMAGE',
            url: '/uploads/messages/audit_mockup.jpg',
            name: 'audit_mockup.jpg',
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
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Insert messages
    const result = await Message.insertMany(messagesData);
    console.log(`✅ Inserted ${result.length} v2 messages\n`);

    // Create indexes
    console.log('📌 Creating indexes...');
    await Message.collection.createIndex({ channelId: 1, createdAt: -1 });
    await Message.collection.createIndex({ senderId: 1, receiverId: 1, createdAt: -1 });
    await Message.collection.createIndex({ 'replyTo.messageId': 1 });
    await Message.collection.createIndex({ 'forwardedFrom.messageId': 1 });
    await Message.collection.createIndex({ 'readBy.userId': 1 });
    await Message.collection.createIndex({ 'attachments.type': 1 });
    console.log('✅ Indexes created\n');

    // Print stats
    const total = await Message.countDocuments();
    const withAttachments = await Message.countDocuments({ 'attachments.0': { $exists: true } });
    const withReply = await Message.countDocuments({ 'replyTo.messageId': { $ne: null } });
    const withForward = await Message.countDocuments({ 'forwardedFrom.messageId': { $ne: null } });

    console.log('========================================');
    console.log('  ✅ Messages v2 Migration Complete!');
    console.log('========================================');
    console.log(`  Total messages      : ${total}`);
    console.log(`  With attachments    : ${withAttachments}`);
    console.log(`  With replies        : ${withReply}`);
    console.log(`  With forwards       : ${withForward}`);
    console.log('========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

run();
