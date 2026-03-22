require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('✓ Connected to MongoDB');
}).catch(err => {
  console.error('✗ MongoDB connection error:', err.message);
  process.exit(1);
});

// Models
const userSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  email:            { type: String, required: true, unique: true, lowercase: true },
  passwordHash:     { type: String, required: true },
  role:             { type: String, enum: ['ADMIN','PM','MEMBER'], default: 'MEMBER' },
  department:       { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  status:           { type: String, enum: ['ACTIVE','INACTIVE','SUSPENDED'], default: 'ACTIVE' },
  avatar:           { type: String, default: null },
  twoFactorEnabled: { type: Boolean, default: true },
  twoFactorSecret:  { type: String, default: null },
  lastLogin:        { type: Date, default: null },
  lastIpAddress:    { type: String, default: null },
  lastDevice:       { type: String, default: null },
}, { timestamps: true });

const departmentSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  managerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  managerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status:      { type: String, enum: ['PLANNING','ACTIVE','ON_HOLD','COMPLETED'], default: 'PLANNING' },
  progress:    { type: Number, min: 0, max: 100, default: 0 },
  deadline:    { type: Date, required: true },
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
  projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  assigneeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  priority:     { type: String, enum: ['LOW','MEDIUM','HIGH','URGENT'], default: 'MEDIUM' },
  status:       { type: String, enum: ['TODO','IN_PROGRESS','REVIEW','COMPLETED'], default: 'TODO' },
  deadline:     { type: Date, default: null },
  completedAt:  { type: Date, default: null },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Department = mongoose.model('Department', departmentSchema);
const Project = mongoose.model('Project', projectSchema);
const Task = mongoose.model('Task', taskSchema);

// Seed function
const seed = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Department.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    console.log('✓ Cleared existing data');

    // Create departments
    const departments = await Department.insertMany([
      { name: 'IT Security', description: 'Security Department' },
      { name: 'Product', description: 'Product Development' },
      { name: 'Engineering', description: 'Engineering Department' },
      { name: 'Human Resources', description: 'Human Resources' }
    ]);
    console.log('✓ Created 4 departments');

    // Hash passwords
    const hashPassword = async (pwd) => {
      const salt = await bcrypt.genSalt(10);
      return bcrypt.hash(pwd, salt);
    };

    // Create users
    const commonPassword = 'SecurePass@123';
    
    // Generate valid 2FA secrets for each user
    const generateSecret = (email) => {
      return speakeasy.generateSecret({
        name: `SecureTeam (${email})`,
        issuer: 'SecureTeam',
        length: 32
      }).base32;
    };
    
    const users = [
      {
        name: 'Admin User',
        email: 'admin@secureteam.com',
        passwordHash: await hashPassword(commonPassword),
        role: 'ADMIN',
        department: departments[0]._id,
        status: 'ACTIVE',
        avatar: 'https://i.pravatar.cc/150?u=admin@secureteam.com',
        twoFactorEnabled: true,
        twoFactorSecret: generateSecret('admin@secureteam.com')
      },
      {
        name: 'dat huy',
        email: 'datvan@gmail.com',
        passwordHash: await hashPassword(commonPassword),
        role: 'PM',
        department: departments[0]._id,
        status: 'ACTIVE',
        avatar: 'https://i.pravatar.cc/150?u=datvan@gmail.com',
        twoFactorEnabled: true,
        twoFactorSecret: generateSecret('datvan@gmail.com')
      },
      {
        name: 'nam khanh',
        email: 'khanhgaavl@gmail.com',
        passwordHash: await hashPassword(commonPassword),
        role: 'MEMBER',
        department: departments[0]._id,
        status: 'ACTIVE',
        avatar: 'https://i.pravatar.cc/150?u=khanhgaavl@gmail.com',
        twoFactorEnabled: true,
        twoFactorSecret: generateSecret('khanhgaavl@gmail.com')
      },
      {
        name: 'nam khanh',
        email: 'khanhgavl@gmail.com',
        passwordHash: await hashPassword(commonPassword),
        role: 'MEMBER',
        department: departments[1]._id,
        status: 'ACTIVE',
        avatar: 'https://i.pravatar.cc/150?u=khanhgavl@gmail.com',
        twoFactorEnabled: true,
        twoFactorSecret: generateSecret('khanhgavl@gmail.com')
      },
      {
        name: 'van duy',
        email: 'duyyy@gmail.com',
        passwordHash: await hashPassword(commonPassword),
        role: 'MEMBER',
        department: departments[0]._id,
        status: 'ACTIVE',
        avatar: 'https://i.pravatar.cc/150?u=duyyy@gmail.com',
        twoFactorEnabled: true,
        twoFactorSecret: generateSecret('duyyy@gmail.com')
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`✓ Created ${createdUsers.length} users`);

    // Create projects with members
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    const projects = await Project.insertMany([
      {
        name: 'Mobile App Redesign',
        description: 'Redesign the mobile app interface and improve user experience',
        managerId: createdUsers[1]._id, // dat huy (PM)
        members: [createdUsers[1]._id, createdUsers[2]._id, createdUsers[4]._id], // PM + 2 members
        status: 'ACTIVE',
        progress: 0, // Will be calculated from tasks
        deadline: futureDate
      },
      {
        name: 'API Security Audit',
        description: 'Conduct comprehensive security audit on current APIs',
        managerId: createdUsers[0]._id, // Admin
        members: [createdUsers[0]._id, createdUsers[2]._id, createdUsers[3]._id], // Admin + 2 members
        status: 'ACTIVE',
        progress: 0, // Will be calculated from tasks
        deadline: futureDate
      }
    ]);
    console.log(`✓ Created ${projects.length} projects with members`);

    // Create tasks for projects
    // Project 1 (Mobile App Redesign): 5 tasks, 3 completed = 60%
    // Project 2 (API Security Audit): 4 tasks, 3 completed = 75%
    const tasks = await Task.insertMany([
      // ========== Mobile App Redesign (Project 0) - 5 tasks, 3 COMPLETED = 60% ==========
      {
        projectId: projects[0]._id,
        departmentId: departments[0]._id,
        title: 'Design mockups for home screen',
        description: 'Create new mockups for the home screen redesign',
        assigneeId: createdUsers[2]._id, // nam khanh
        priority: 'HIGH',
        status: 'COMPLETED',
        deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
      },
      {
        projectId: projects[0]._id,
        departmentId: departments[0]._id,
        title: 'Implement new UI components',
        description: 'Implement the redesigned UI components in React',
        assigneeId: createdUsers[4]._id, // van duy
        priority: 'HIGH',
        status: 'COMPLETED',
        deadline: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        projectId: projects[0]._id,
        departmentId: departments[0]._id,
        title: 'Create API integrations',
        description: 'Integrate new UI with backend API endpoints',
        assigneeId: createdUsers[1]._id, // dat huy
        priority: 'HIGH',
        status: 'COMPLETED',
        deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        projectId: projects[0]._id,
        departmentId: departments[0]._id,
        title: 'Conduct user testing',
        description: 'Perform user testing sessions and gather feedback',
        assigneeId: createdUsers[2]._id, // nam khanh
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        deadline: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
      },
      {
        projectId: projects[0]._id,
        departmentId: departments[0]._id,
        title: 'Optimize performance',
        description: 'Improve app performance and reduce load times',
        assigneeId: createdUsers[4]._id, // van duy
        priority: 'MEDIUM',
        status: 'TODO',
        deadline: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)
      },
      
      // ========== API Security Audit (Project 1) - 4 tasks, 3 COMPLETED = 75% ==========
      {
        projectId: projects[1]._id,
        departmentId: departments[0]._id,
        title: 'Scan vulnerabilities',
        description: 'Run automated security scans on all APIs',
        assigneeId: createdUsers[2]._id, // nam khanh
        priority: 'URGENT',
        status: 'COMPLETED',
        deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        projectId: projects[1]._id,
        departmentId: departments[0]._id,
        title: 'Review authentication endpoints',
        description: 'Manually review and test authentication endpoints',
        assigneeId: createdUsers[3]._id, // nam khanh (product dept)
        priority: 'URGENT',
        status: 'COMPLETED',
        deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        projectId: projects[1]._id,
        departmentId: departments[0]._id,
        title: 'Fix identified security issues',
        description: 'Resolve all critical and high severity vulnerabilities',
        assigneeId: createdUsers[0]._id, // Admin
        priority: 'URGENT',
        status: 'COMPLETED',
        deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        projectId: projects[1]._id,
        departmentId: departments[0]._id,
        title: 'Generate security report',
        description: 'Create comprehensive security audit report',
        assigneeId: createdUsers[2]._id, // nam khanh
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)
      }
    ]);
    console.log(`✓ Created ${tasks.length} tasks`);
    console.log('  - Project 1 (Mobile App Redesign): 3/5 tasks completed = 60%');
    console.log('  - Project 2 (API Security Audit): 3/4 tasks completed = 75%');

    console.log('\n📋 Demo Accounts:');
    console.log('  👤 admin@secureteam.com / SecurePass@123 (ADMIN)');
    console.log('  👤 datvan@gmail.com / SecurePass@123 (PM)');
    console.log('  👤 khanhgaavl@gmail.com / SecurePass@123 (MEMBER)');
    console.log('  👤 khanhgavl@gmail.com / SecurePass@123 (MEMBER)');
    console.log('  👤 duyyy@gmail.com / SecurePass@123 (MEMBER)');
    
    console.log('\n📦 Projects Created (Progress calculated from tasks):');
    console.log(`  1. ${projects[0].name} (Deadline: ${projects[0].deadline.toDateString()})`);
    console.log(`  2. ${projects[1].name} (Deadline: ${projects[1].deadline.toDateString()})`);
    console.log('\n✅ Seed completed successfully!');

    process.exit(0);
  } catch (err) {
    console.error('✗ Seed error:', err.message);
    process.exit(1);
  }
};

seed();
