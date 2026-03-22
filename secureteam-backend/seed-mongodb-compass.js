// ============================================================
//  SECURETEAM - MongoDB Compass Script (CORRECTED)
//  Hướng dẫn:
//  1. Mở MongoDB Compass → Connect
//  2. Vào tab "MongoSH" (góc dưới trái)
//  3. Copy toàn bộ nội dung này → Paste → Enter
// ============================================================

// Chọn / tạo database
use('secureteam');

// Xóa collections cũ nếu có
db.users.drop();
db.departments.drop();
db.projects.drop();
db.tasks.drop();
db.documents.drop();
db.attendances.drop();
db.securitylogs.drop();
db.channels.drop();
db.messages.drop();

print('========================================');
print('  Bắt đầu tạo database SecureTeam...');
print('========================================');

// ─────────────────────────────────────────
//  1. DEPARTMENTS
// ─────────────────────────────────────────
const deptIT = ObjectId('660000000000000000000001');
const deptProduct = ObjectId('660000000000000000000002');
const deptEng = ObjectId('660000000000000000000003');
const deptHR = ObjectId('660000000000000000000004');

// Admin user ID sẽ dùng làm manager
const adminId = ObjectId('660000000000000000000101');
const pmId = ObjectId('660000000000000000000102');

db.departments.insertMany([
  { _id: deptIT, name: 'IT Security',      description: 'Cybersecurity and compliance',            managerId: adminId, createdAt: new Date(), updatedAt: new Date() },
  { _id: deptProduct, name: 'Product',          description: 'Product management and design',           managerId: pmId, createdAt: new Date(), updatedAt: new Date() },
  { _id: deptEng, name: 'Engineering',      description: 'Software development and infrastructure', managerId: adminId, createdAt: new Date(), updatedAt: new Date() },
  { _id: deptHR, name: 'Human Resources',  description: 'HR and people operations',                managerId: null, createdAt: new Date(), updatedAt: new Date() },
]);
print('✅ Departments: ' + db.departments.countDocuments() + ' records');

// ─────────────────────────────────────────
//  2. USERS
//  PASSWORD HASH: bcrypt của "SecurePass@123" (cost 10)
//  Hash này được tính lại từ bcryptjs
// ─────────────────────────────────────────
db.users.insertMany([
  {
    _id: adminId,
    name: 'Admin User',
    email: 'admin@secureteam.com',
    passwordHash: '$2a$10$zW.HxBYK4vbfVFu1XGRHheN.KYwBhKmWuww8o6gfMHmXSEuBKe1mG',
    role: 'ADMIN',
    department: deptIT,
    status: 'ACTIVE',
    avatar: 'https://i.pravatar.cc/150?u=admin',
    twoFactorEnabled: true,
    twoFactorSecret: null,
    lastLogin: new Date('2026-03-11T08:30:12Z'),
    lastIpAddress: '192.168.1.1',
    lastDevice: 'MacBook Pro / Chrome',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: pmId,
    name: 'Sarah Chen',
    email: 'pm@secureteam.com',
    passwordHash: '$2a$10$zW.HxBYK4vbfVFu1XGRHheN.KYwBhKmWuww8o6gfMHmXSEuBKe1mG',
    role: 'PM',
    department: deptProduct,
    status: 'ACTIVE',
    avatar: 'https://i.pravatar.cc/150?u=pm',
    twoFactorEnabled: true,
    twoFactorSecret: null,
    lastLogin: new Date('2026-03-11T09:00:00Z'),
    lastIpAddress: '192.168.1.2',
    lastDevice: 'MacBook Air / Safari',
    createdAt: new Date('2026-01-05T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000103'),
    name: 'Alex Rivera',
    email: 'member@secureteam.com',
    passwordHash: '$2a$10$zW.HxBYK4vbfVFu1XGRHheN.KYwBhKmWuww8o6gfMHmXSEuBKe1mG',
    role: 'MEMBER',
    department: deptEng,
    status: 'ACTIVE',
    avatar: 'https://i.pravatar.cc/150?u=member',
    twoFactorEnabled: true,
    twoFactorSecret: null,
    lastLogin: new Date('2026-03-11T08:55:05Z'),
    lastIpAddress: '10.0.0.5',
    lastDevice: 'Windows 11 / Edge',
    createdAt: new Date('2026-01-10T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000104'),
    name: 'Minh Nguyen',
    email: 'minh@secureteam.com',
    passwordHash: '$2a$10$zW.HxBYK4vbfVFu1XGRHheN.KYwBhKmWuww8o6gfMHmXSEuBKe1mG',
    role: 'MEMBER',
    department: deptEng,
    status: 'ACTIVE',
    avatar: 'https://i.pravatar.cc/150?u=minh',
    twoFactorEnabled: true,
    twoFactorSecret: null,
    lastLogin: null,
    lastIpAddress: null,
    lastDevice: null,
    createdAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000105'),
    name: 'Linh Tran',
    email: 'linh@secureteam.com',
    passwordHash: '$2a$10$zW.HxBYK4vbfVFu1XGRHheN.KYwBhKmWuww8o6gfMHmXSEuBKe1mG',
    role: 'MEMBER',
    department: deptHR,
    status: 'ACTIVE',
    avatar: 'https://i.pravatar.cc/150?u=linh',
    twoFactorEnabled: true,
    twoFactorSecret: null,
    lastLogin: null,
    lastIpAddress: null,
    lastDevice: null,
    createdAt: new Date('2026-01-20T00:00:00Z'),
    updatedAt: new Date(),
  },
]);
print('✅ Users: ' + db.users.countDocuments() + ' records');

// ─────────────────────────────────────────
//  3. PROJECTS
// ─────────────────────────────────────────
db.projects.insertMany([
  {
    _id: ObjectId('660000000000000000000201'),
    name: 'Cloud Migration',
    description: 'Migrating legacy servers to AWS',
    managerId: pmId,
    members: [
      ObjectId('660000000000000000000103'),
      ObjectId('660000000000000000000104'),
    ],
    status: 'ACTIVE',
    progress: 65,
    deadline: new Date('2026-04-15'),
    createdAt: new Date('2026-01-10T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000202'),
    name: 'Mobile App Redesign',
    description: 'New UI/UX for the consumer app',
    managerId: pmId,
    members: [
      ObjectId('660000000000000000000103'),
    ],
    status: 'PLANNING',
    progress: 15,
    deadline: new Date('2026-06-01'),
    createdAt: new Date('2026-02-20T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000203'),
    name: 'Security Hardening',
    description: 'Enterprise-wide security audit and hardening',
    managerId: adminId,
    members: [
      ObjectId('660000000000000000000103'),
      ObjectId('660000000000000000000104'),
      ObjectId('660000000000000000000105'),
    ],
    status: 'ACTIVE',
    progress: 40,
    deadline: new Date('2026-05-01'),
    createdAt: new Date('2026-02-01T00:00:00Z'),
    updatedAt: new Date(),
  },
]);
print('✅ Projects: ' + db.projects.countDocuments() + ' records');

// ─────────────────────────────────────────
//  4. TASKS
// ─────────────────────────────────────────
db.tasks.insertMany([
  // -- Cloud Migration --
  {
    _id: ObjectId('660000000000000000000301'),
    projectId: ObjectId('660000000000000000000201'),
    title: 'Setup VPC',
    description: 'Configure network infrastructure on AWS',
    assigneeId: ObjectId('660000000000000000000103'),
    priority: 'HIGH',
    status: 'COMPLETED',
    deadline: new Date('2026-03-01'),
    completedAt: new Date('2026-02-28'),
    createdAt: new Date('2026-01-10T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000302'),
    projectId: ObjectId('660000000000000000000201'),
    title: 'Database Migration',
    description: 'Move RDS instances to cloud',
    assigneeId: ObjectId('660000000000000000000103'),
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    deadline: new Date('2026-03-20'),
    completedAt: null,
    createdAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000303'),
    projectId: ObjectId('660000000000000000000201'),
    title: 'Security Audit',
    description: 'Review IAM policies and permissions',
    assigneeId: pmId,
    priority: 'MEDIUM',
    status: 'TODO',
    deadline: new Date('2026-03-25'),
    completedAt: null,
    createdAt: new Date('2026-01-20T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000304'),
    projectId: ObjectId('660000000000000000000201'),
    title: 'Load Balancer Config',
    description: 'Setup ALB and auto-scaling groups',
    assigneeId: ObjectId('660000000000000000000104'),
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    deadline: new Date('2026-04-01'),
    completedAt: null,
    createdAt: new Date('2026-02-01T00:00:00Z'),
    updatedAt: new Date(),
  },
  // -- Mobile App Redesign --
  {
    _id: ObjectId('660000000000000000000305'),
    projectId: ObjectId('660000000000000000000202'),
    title: 'Wireframe Design',
    description: 'Create wireframes for all screens',
    assigneeId: ObjectId('660000000000000000000103'),
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    deadline: new Date('2026-03-30'),
    completedAt: null,
    createdAt: new Date('2026-02-20T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000306'),
    projectId: ObjectId('660000000000000000000202'),
    title: 'User Research',
    description: 'Conduct user interviews and surveys',
    assigneeId: pmId,
    priority: 'MEDIUM',
    status: 'COMPLETED',
    deadline: new Date('2026-03-15'),
    completedAt: new Date('2026-03-12'),
    createdAt: new Date('2026-02-20T00:00:00Z'),
    updatedAt: new Date(),
  },
  // -- Security Hardening --
  {
    _id: ObjectId('660000000000000000000307'),
    projectId: ObjectId('660000000000000000000203'),
    title: 'Penetration Testing',
    description: 'External pentest engagement',
    assigneeId: adminId,
    priority: 'URGENT',
    status: 'TODO',
    deadline: new Date('2026-04-10'),
    completedAt: null,
    createdAt: new Date('2026-02-01T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000308'),
    projectId: ObjectId('660000000000000000000203'),
    title: 'MFA Rollout',
    description: 'Enable MFA for all employees',
    assigneeId: ObjectId('660000000000000000000105'),
    priority: 'HIGH',
    status: 'COMPLETED',
    deadline: new Date('2026-03-10'),
    completedAt: new Date('2026-03-09'),
    createdAt: new Date('2026-02-01T00:00:00Z'),
    updatedAt: new Date(),
  },
]);
print('✅ Tasks: ' + db.tasks.countDocuments() + ' records');

// ─────────────────────────────────────────
//  5. DOCUMENTS
// ─────────────────────────────────────────
db.documents.insertMany([
  {
    _id: ObjectId('660000000000000000000401'),
    name: 'Project_Charter.pdf',
    projectId: ObjectId('660000000000000000000201'),
    uploadedBy: pmId,
    fileUrl: '/uploads/Project_Charter.pdf',
    size: 1258291,
    mimeType: 'application/pdf',
    type: 'PDF',
    createdAt: new Date('2026-01-12T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000402'),
    name: 'Architecture_Diagram.png',
    projectId: ObjectId('660000000000000000000201'),
    uploadedBy: ObjectId('660000000000000000000103'),
    fileUrl: '/uploads/Architecture_Diagram.png',
    size: 4718592,
    mimeType: 'image/png',
    type: 'IMAGE',
    createdAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000403'),
    name: 'Migration_Plan.xlsx',
    projectId: ObjectId('660000000000000000000201'),
    uploadedBy: pmId,
    fileUrl: '/uploads/Migration_Plan.xlsx',
    size: 524288,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    type: 'EXCEL',
    createdAt: new Date('2026-01-18T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000404'),
    name: 'UI_Mockups.pdf',
    projectId: ObjectId('660000000000000000000202'),
    uploadedBy: ObjectId('660000000000000000000103'),
    fileUrl: '/uploads/UI_Mockups.pdf',
    size: 3145728,
    mimeType: 'application/pdf',
    type: 'PDF',
    createdAt: new Date('2026-02-25T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000405'),
    name: 'Security_Policy.docx',
    projectId: ObjectId('660000000000000000000203'),
    uploadedBy: adminId,
    fileUrl: '/uploads/Security_Policy.docx',
    size: 786432,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    type: 'WORD',
    createdAt: new Date('2026-02-05T00:00:00Z'),
    updatedAt: new Date(),
  },
]);
print('✅ Documents: ' + db.documents.countDocuments() + ' records');

// ─────────────────────────────────────────
//  6. ATTENDANCES
// ─────────────────────────────────────────
db.attendances.insertMany([
  { _id: ObjectId('660000000000000000000501'), userId: adminId, date: '2026-03-11', checkIn: '08:30', checkOut: '17:30', status: 'PRESENT',  note: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: ObjectId('660000000000000000000502'), userId: pmId, date: '2026-03-11', checkIn: '09:15', checkOut: '18:00', status: 'PRESENT',  note: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: ObjectId('660000000000000000000503'), userId: ObjectId('660000000000000000000103'), date: '2026-03-11', checkIn: '08:55', checkOut: '17:30', status: 'PRESENT',  note: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: ObjectId('660000000000000000000504'), userId: ObjectId('660000000000000000000104'), date: '2026-03-11', checkIn: '10:05', checkOut: '17:00', status: 'LATE',     note: 'Kẹt xe', createdAt: new Date(), updatedAt: new Date() },
  { _id: ObjectId('660000000000000000000505'), userId: ObjectId('660000000000000000000105'), date: '2026-03-11', checkIn: null,    checkOut: null,    status: 'ABSENT',   note: 'Nghỉ ốm', createdAt: new Date(), updatedAt: new Date() },
  { _id: ObjectId('660000000000000000000506'), userId: adminId, date: '2026-03-10', checkIn: '08:00', checkOut: '17:00', status: 'PRESENT',  note: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: ObjectId('660000000000000000000507'), userId: pmId, date: '2026-03-10', checkIn: '09:00', checkOut: '13:00', status: 'HALF_DAY', note: 'Khám bệnh', createdAt: new Date(), updatedAt: new Date() },
  { _id: ObjectId('660000000000000000000508'), userId: ObjectId('660000000000000000000103'), date: '2026-03-10', checkIn: '09:00', checkOut: '17:00', status: 'PRESENT',  note: '', createdAt: new Date(), updatedAt: new Date() },
]);
print('✅ Attendances: ' + db.attendances.countDocuments() + ' records');

// ─────────────────────────────────────────
//  7. SECURITY LOGS
// ─────────────────────────────────────────
db.securitylogs.insertMany([
  {
    _id: ObjectId('660000000000000000000601'),
    userId: adminId,
    userName: 'Admin User',
    action: 'Login',
    ipAddress: '192.168.1.1',
    device: 'MacBook Pro / Chrome',
    status: 'SUCCESS',
    meta: {},
    createdAt: new Date('2026-03-11T08:30:12Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000602'),
    userId: ObjectId('660000000000000000000103'),
    userName: 'Alex Rivera',
    action: 'Login',
    ipAddress: '10.0.0.5',
    device: 'Windows 11 / Edge',
    status: 'SUCCESS',
    meta: {},
    createdAt: new Date('2026-03-11T08:55:05Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000603'),
    userId: null,
    userName: 'unknown',
    action: 'Login Attempt',
    ipAddress: '45.12.33.1',
    device: 'Linux / Firefox',
    status: 'FAILED',
    meta: { reason: 'Invalid credentials' },
    createdAt: new Date('2026-03-11T09:10:44Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000604'),
    userId: pmId,
    userName: 'Sarah Chen',
    action: 'Login',
    ipAddress: '192.168.1.2',
    device: 'MacBook Air / Safari',
    status: 'SUCCESS',
    meta: {},
    createdAt: new Date('2026-03-11T09:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000605'),
    userId: null,
    userName: 'unknown',
    action: 'Login Attempt',
    ipAddress: '103.56.22.9',
    device: 'Unknown',
    status: 'FAILED',
    meta: { reason: 'Account not found' },
    createdAt: new Date('2026-03-11T09:25:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000606'),
    userId: ObjectId('660000000000000000000104'),
    userName: 'Minh Nguyen',
    action: 'Password Change',
    ipAddress: '10.0.0.8',
    device: 'Android / Chrome',
    status: 'SUCCESS',
    meta: {},
    createdAt: new Date('2026-03-10T14:00:00Z'),
    updatedAt: new Date(),
  },
]);
print('✅ Security Logs: ' + db.securitylogs.countDocuments() + ' records');

// ─────────────────────────────────────────
//  8. CHANNELS
// ─────────────────────────────────────────
db.channels.insertMany([
  {
    _id: ObjectId('660000000000000000000701'),
    name: 'general',
    description: 'Company-wide announcements',
    members: [
      adminId,
      pmId,
      ObjectId('660000000000000000000103'),
      ObjectId('660000000000000000000104'),
      ObjectId('660000000000000000000105'),
    ],
    createdBy: adminId,
    isPrivate: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000702'),
    name: 'engineering',
    description: 'Dev team discussions',
    members: [
      adminId,
      ObjectId('660000000000000000000103'),
      ObjectId('660000000000000000000104'),
    ],
    createdBy: adminId,
    isPrivate: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date(),
  },
]);
print('✅ Channels: ' + db.channels.countDocuments() + ' records');

// ─────────────────────────────────────────
//  9. MESSAGES
// ─────────────────────────────────────────
db.messages.insertMany([
  // -- #general --
  {
    _id: ObjectId('660000000000000000000801'),
    senderId: adminId,
    receiverId: null,
    channelId: ObjectId('660000000000000000000701'),
    text: 'Welcome to SecureTeam! Please complete your profile setup.',
    reactions: [],
    isDeleted: false,
    editedAt: null,
    createdAt: new Date('2026-03-10T09:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000802'),
    senderId: pmId,
    receiverId: null,
    channelId: ObjectId('660000000000000000000701'),
    text: 'Cloud Migration sprint starts Monday. Check your tasks!',
    reactions: [{ emoji: '👍', users: [ObjectId('660000000000000000000103')] }],
    isDeleted: false,
    editedAt: null,
    createdAt: new Date('2026-03-10T10:00:00Z'),
    updatedAt: new Date(),
  },
  // -- #engineering --
  {
    _id: ObjectId('660000000000000000000803'),
    senderId: ObjectId('660000000000000000000103'),
    receiverId: null,
    channelId: ObjectId('660000000000000000000702'),
    text: 'VPC setup is done. Moving to DB migration now.',
    reactions: [],
    isDeleted: false,
    editedAt: null,
    createdAt: new Date('2026-03-11T09:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000804'),
    senderId: ObjectId('660000000000000000000104'),
    receiverId: null,
    channelId: ObjectId('660000000000000000000702'),
    text: 'Load balancer config in progress, will update by EOD.',
    reactions: [],
    isDeleted: false,
    editedAt: null,
    createdAt: new Date('2026-03-11T10:30:00Z'),
    updatedAt: new Date(),
  },
  // -- Direct Messages --
  {
    _id: ObjectId('660000000000000000000805'),
    senderId: pmId,
    receiverId: ObjectId('660000000000000000000103'),
    channelId: null,
    text: 'Hey Alex, can you review the security audit task?',
    reactions: [],
    isDeleted: false,
    editedAt: null,
    createdAt: new Date('2026-03-11T11:00:00Z'),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId('660000000000000000000806'),
    senderId: ObjectId('660000000000000000000103'),
    receiverId: pmId,
    channelId: null,
    text: 'Sure Sarah, will take a look this afternoon!',
    reactions: [],
    isDeleted: false,
    editedAt: null,
    createdAt: new Date('2026-03-11T11:05:00Z'),
    updatedAt: new Date(),
  },
]);
print('✅ Messages: ' + db.messages.countDocuments() + ' records');

// ─────────────────────────────────────────
//  10. TẠO INDEXES
// ─────────────────────────────────────────
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ status: 1 });

db.projects.createIndex({ managerId: 1 });
db.projects.createIndex({ members: 1 });
db.projects.createIndex({ status: 1 });

db.tasks.createIndex({ projectId: 1 });
db.tasks.createIndex({ assigneeId: 1 });
db.tasks.createIndex({ status: 1 });

db.attendances.createIndex({ userId: 1, date: 1 }, { unique: true });
db.attendances.createIndex({ date: 1 });

db.securitylogs.createIndex({ createdAt: -1 });
db.securitylogs.createIndex({ userId: 1 });
db.securitylogs.createIndex({ status: 1 });

db.messages.createIndex({ channelId: 1 });
db.messages.createIndex({ senderId: 1, receiverId: 1 });

db.channels.createIndex({ name: 1 }, { unique: true });

print('✅ Indexes created');

// ─────────────────────────────────────────
//  SUMMARY
// ─────────────────────────────────────────
print('');
print('========================================');
print('  SecureTeam DB đã sẵn sàng!');
print('========================================');
print('  Database  : secureteam');
print('  Users     : ' + db.users.countDocuments());
print('  Depts     : ' + db.departments.countDocuments());
print('  Projects  : ' + db.projects.countDocuments());
print('  Tasks     : ' + db.tasks.countDocuments());
print('  Documents : ' + db.documents.countDocuments());
print('  Attendance: ' + db.attendances.countDocuments());
print('  Sec Logs  : ' + db.securitylogs.countDocuments());
print('  Channels  : ' + db.channels.countDocuments());
print('  Messages  : ' + db.messages.countDocuments());
print('========================================');
print('  ✅ Tài khoản test (password: SecurePass@123)');
print('  📧 admin@secureteam.com  → ADMIN');
print('  📧 pm@secureteam.com     → PM');
print('  📧 member@secureteam.com → MEMBER');
print('========================================');
print('  💾 Mỗi database record đều khớp hoàn toàn');
print('  với backend models!');
print('========================================');
