// Script seed honeytokens - Bẫy nội gián để phát hiện nhân viên truy cập trái phép
const mongoose = require('mongoose');
const { Document, Project } = require('./models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/secureteam-db';

const honeytokens = [
  { name: '[CONFIDENTIAL] Salary Review 2026.pdf', type: 'PDF' },
  { name: '[SECRET] Executive Compensation Plan.doc', type: 'WORD' },
  { name: '[INTERNAL] Board Meeting Minutes - Q1 2026.docx', type: 'WORD' },
  { name: '[RESTRICTED] Financial Projections 2026-2030.xlsx', type: 'EXCEL' },
  { name: '[TOP SECRET] M&A Strategy Document.pdf', type: 'PDF' },
  { name: '[DO NOT SHARE] Employee Personal Records.xlsx', type: 'EXCEL' },
  { name: '[CONFIDENTIAL] Client Database - Unencrypted.csv', type: 'EXCEL' },
  { name: '[CLASSIFIED] Security Vulnerability Report.pdf', type: 'PDF' },
];

async function seedHoneytokens() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Lấy project đầu tiên hoặc ADMIN user
    const project = await Project.findOne();
    if (!project) {
      console.error('❌ No projects found. Please create a project first.');
      process.exit(1);
    }

    console.log(`\n📌 Creating honeytokens for project: ${project.name}`);
    
    let created = 0;
    for (const token of honeytokens) {
      const existing = await Document.findOne({ name: token.name, isHoneytoken: true });
      
      if (!existing) {
        const doc = await Document.create({
          name: token.name,
          projectId: project._id,
          uploadedBy: project.managerId,
          fileUrl: '/honeypot/fake-file.bin',
          size: Math.random() * 5 * 1024 * 1024, // Mock size
          mimeType: 'application/octet-stream',
          type: token.type,
          isHoneytoken: true,
          honeytokenAccessLog: [],
        });
        console.log(`   ✅ Created: ${token.name}`);
        created++;
      } else {
        console.log(`   ⏭️  Already exists: ${token.name}`);
      }
    }

    console.log(`\n🎯 Honeytokens seeding complete: ${created} new traps created`);
    console.log('\n⚠️  When any user downloads/accesses these documents:');
    console.log('   1. Access is logged with timestamp and IP address');
    console.log('   2. Security alert is created (visible in SecurityLogPage)');
    console.log('   3. User receives a warning alert');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
  }
}

seedHoneytokens();
