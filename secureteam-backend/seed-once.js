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

// Seed function - ONLY CREATE IF NOT EXISTS
const seed = async () => {
  try {
    console.log('📌 Checking existing data...\n');

    // Hash passwords
    const hashPassword = async (pwd) => {
      const salt = await bcrypt.genSalt(10);
      return bcrypt.hash(pwd, salt);
    };

    // Generate valid 2FA secrets (ONCE per user)
    const generateSecret = (email) => {
      return speakeasy.generateSecret({
        name: `SecureTeam (${email})`,
        issuer: 'SecureTeam',
        length: 32
      }).base32;
    };

    // Check and create departments (only if not exist)
    let depts = await Department.find();
    if (depts.length === 0) {
      const departments = await Department.insertMany([
        { name: 'IT Security', description: 'Security Department' },
        { name: 'Product', description: 'Product Development' },
        { name: 'Engineering', description: 'Engineering Department' },
        { name: 'Human Resources', description: 'Human Resources' }
      ]);
      console.log('✓ Created 4 departments');
      depts = departments;
    } else {
      console.log(`✓ Departments already exist (${depts.length})`);
    }

    // Define users to ensure exist
    const commonPassword = 'SecurePass@123';
    const usersToEnsure = [
      {
        name: 'Admin User',
        email: 'admin@secureteam.com',
        role: 'ADMIN',
        department: depts[0]._id,
      },
      {
        name: 'dat huy',
        email: 'datvan@gmail.com',
        role: 'PM',
        department: depts[0]._id,
      },
      {
        name: 'nam khanh',
        email: 'khanhgaavl@gmail.com',
        role: 'MEMBER',
        department: depts[0]._id,
      },
      {
        name: 'nam khanh',
        email: 'khanhgavl@gmail.com',
        role: 'MEMBER',
        department: depts[1]._id,
      },
      {
        name: 'van duy',
        email: 'duyyy@gmail.com',
        role: 'MEMBER',
        department: depts[0]._id,
      }
    ];

    // Create or skip users
    let createdUsers = [];
    for (const userData of usersToEnsure) {
      let user = await User.findOne({ email: userData.email });
      if (user) {
        console.log(`  ℹ️  User exists: ${userData.email}`);
        createdUsers.push(user);
      } else {
        const newUser = await User.create({
          ...userData,
          passwordHash: await hashPassword(commonPassword),
          status: 'ACTIVE',
          avatar: `https://i.pravatar.cc/150?u=${userData.email}`,
          twoFactorEnabled: true,
          twoFactorSecret: generateSecret(userData.email),
        });
        console.log(`  ✓ Created user: ${userData.email}`);
        createdUsers.push(newUser);
      }
    }

    // Check and create projects (only if not exist)
    const projectCount = await Project.countDocuments();
    if (projectCount === 0) {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const projects = await Project.insertMany([
        {
          name: 'Mobile App Redesign',
          description: 'Redesign the mobile app interface and improve user experience',
          managerId: createdUsers[1]._id, // dat huy (PM)
          members: [createdUsers[1]._id, createdUsers[2]._id, createdUsers[4]._id],
          status: 'ACTIVE',
          progress: 0,
          deadline: futureDate
        },
        {
          name: 'API Security Audit',
          description: 'Conduct comprehensive security audit on current APIs',
          managerId: createdUsers[0]._id, // Admin
          members: [createdUsers[0]._id, createdUsers[2]._id, createdUsers[3]._id],
          status: 'ACTIVE',
          progress: 0,
          deadline: futureDate
        }
      ]);
      console.log(`✓ Created ${projects.length} projects`);

      // Create tasks for projects
      await Task.insertMany([
        // Mobile App Redesign: 3/5 COMPLETED = 60%
        {
          projectId: projects[0]._id,
          departmentId: depts[0]._id,
          title: 'Design mockups for home screen',
          assigneeId: createdUsers[2]._id,
          priority: 'HIGH',
          status: 'COMPLETED',
          deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
        },
        {
          projectId: projects[0]._id,
          departmentId: depts[0]._id,
          title: 'Implement new UI components',
          assigneeId: createdUsers[4]._id,
          priority: 'HIGH',
          status: 'COMPLETED',
          deadline: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
        },
        {
          projectId: projects[0]._id,
          departmentId: depts[0]._id,
          title: 'Create API integrations',
          assigneeId: createdUsers[1]._id,
          priority: 'HIGH',
          status: 'COMPLETED',
          deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          projectId: projects[0]._id,
          departmentId: depts[0]._id,
          title: 'Conduct user testing',
          assigneeId: createdUsers[2]._id,
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          deadline: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
        },
        {
          projectId: projects[0]._id,
          departmentId: depts[0]._id,
          title: 'Optimize performance',
          assigneeId: createdUsers[4]._id,
          priority: 'MEDIUM',
          status: 'TODO',
          deadline: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)
        },
        
        // API Security Audit: 3/4 COMPLETED = 75%
        {
          projectId: projects[1]._id,
          departmentId: depts[0]._id,
          title: 'Scan vulnerabilities',
          assigneeId: createdUsers[2]._id,
          priority: 'URGENT',
          status: 'COMPLETED',
          deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        },
        {
          projectId: projects[1]._id,
          departmentId: depts[0]._id,
          title: 'Review authentication endpoints',
          assigneeId: createdUsers[3]._id,
          priority: 'URGENT',
          status: 'COMPLETED',
          deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          projectId: projects[1]._id,
          departmentId: depts[0]._id,
          title: 'Fix identified security issues',
          assigneeId: createdUsers[0]._id,
          priority: 'URGENT',
          status: 'COMPLETED',
          deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          projectId: projects[1]._id,
          departmentId: depts[0]._id,
          title: 'Generate security report',
          assigneeId: createdUsers[2]._id,
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)
        }
      ]);
      console.log(`✓ Created 9 tasks`);
    } else {
      console.log(`✓ Projects/tasks already exist`);
    }

    console.log('\n📋 Demo Accounts (2FA secrets saved - NEVER CHANGE):');
    for (const user of createdUsers) {
      console.log(`  👤 ${user.email} / SecurePass@123 (${user.role})`);
      console.log(`     🔑 2FA Secret: ${user.twoFactorSecret}`);
    }

    console.log('\n✅ Seed completed! Database kept intact.');
    process.exit(0);
  } catch (err) {
    console.error('✗ Seed error:', err.message);
    process.exit(1);
  }
};

seed();
