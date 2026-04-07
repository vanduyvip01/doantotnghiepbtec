// Re-export tất cả models từ secureteam-db (dùng chung models)
// Hoặc định nghĩa lại inline ở đây cho tiện

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ── USER ──────────────────────────────────
const userSchema = new Schema({
  name:             { type: String, required: true },
  email:            { type: String, required: true, unique: true, lowercase: true },
  passwordHash:     { type: String, required: true },
  role:             { type: String, enum: ['ADMIN','PM','MEMBER'], default: 'MEMBER' },
  department:       { type: Schema.Types.ObjectId, ref: 'Department', default: null },
  status:           { type: String, enum: ['ACTIVE','INACTIVE','SUSPENDED'], default: 'ACTIVE' },
  avatar:           { type: String, default: null },
  twoFactorEnabled: { type: Boolean, default: true },
  twoFactorSecret:  { type: String, default: null },
  lastLogin:        { type: Date, default: null },
  lastIpAddress:    { type: String, default: null },
  lastDevice:       { type: String, default: null },
  // ── E2E Encryption ──
  publicKey:        { type: String, default: null },        // Công khoá công khai
  encryptedPrivateKey: { type: String, default: null },     // Private key mã hoá (base64)
  keysGeneratedAt:  { type: Date, default: null },
}, { timestamps: true });

// ── DEPARTMENT ────────────────────────────
const departmentSchema = new Schema({
  name:        { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  managerId:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// ── PROJECT ───────────────────────────────
const projectSchema = new Schema({
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  managerId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members:     [{ type: Schema.Types.ObjectId, ref: 'User' }],
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
  status:      { type: String, enum: ['PLANNING','ACTIVE','ON_HOLD','COMPLETED'], default: 'PLANNING' },
  progress:    { type: Number, min: 0, max: 100, default: 0 },
  deadline:    { type: Date, required: true },
}, { timestamps: true });

// ── TASK ──────────────────────────────────
const taskSchema = new Schema({
  projectId:    { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  assigneeId:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
  priority:     { type: String, enum: ['LOW','MEDIUM','HIGH','URGENT'], default: 'MEDIUM' },
  status:       { type: String, enum: ['TODO','IN_PROGRESS','REVIEW','COMPLETED'], default: 'TODO' },
  deadline:     { type: Date, default: null },
  completedAt:  { type: Date, default: null },
}, { timestamps: true });

taskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'COMPLETED' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// ── TASK COMMENT ───────────────────────────
const taskCommentSchema = new Schema({
  taskId:     { type: Schema.Types.ObjectId, ref: 'Task', required: true },
  authorId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text:       { type: String, required: true },
  mentions:   [{ type: Schema.Types.ObjectId, ref: 'User' }],
  edited:     { type: Boolean, default: false },
  editedAt:   { type: Date, default: null },
}, { timestamps: true });

// ── TASK ATTACHMENT ────────────────────────
const taskAttachmentSchema = new Schema({
  taskId:     { type: Schema.Types.ObjectId, ref: 'Task', required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fileName:   { type: String, required: true },
  fileUrl:    { type: String, required: true },
  fileSize:   { type: Number, required: true },
  mimeType:   { type: String, required: true },
  fileType:   { type: String, enum: ['PDF','IMAGE','WORD','EXCEL','CODE','OTHER'], default: 'OTHER' },
}, { timestamps: true });

// ── DOCUMENT ──────────────────────────────
const documentSchema = new Schema({
  name:       { type: String, required: true },
  projectId:  { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl:    { type: String, required: true },
  size:       { type: Number, required: true },
  mimeType:   { type: String, required: true },
  type:       { type: String, enum: ['PDF','IMAGE','WORD','EXCEL','OTHER'], default: 'OTHER' },
  isHoneytoken: { type: Boolean, default: false }, // ← Bẫy nội gián
  honeytokenAccessLog: [{ // ← Ghi log người truy cập
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    actionType: { type: String, enum: ['VIEW','DOWNLOAD'] },
    ipAddress: String,
    timestamp: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

// ── ATTENDANCE ────────────────────────────
const attendanceSchema = new Schema({
  userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date:     { type: String, required: true },
  checkIn:  { type: String, default: null },
  checkOut: { type: String, default: null },
  status:   { type: String, enum: ['PRESENT','LATE','ABSENT','HALF_DAY'], default: 'ABSENT' },
  note:     { type: String, default: '' },
}, { timestamps: true });
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// ── SECURITY LOG ──────────────────────────
const securityLogSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  userName:  { type: String, required: true },
  action:    { type: String, required: true },
  ipAddress: { type: String, required: true },
  device:    { type: String, default: 'Unknown' },
  status:    { type: String, enum: ['SUCCESS','FAILED'], required: true },
  meta:      { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// ── CHANNEL ───────────────────────────────
const channelSchema = new Schema({
  name:      { type: String, required: true },
  description:{ type: String, default: '' },
  members:   [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isPrivate: { type: Boolean, default: false },
}, { timestamps: true });

// ── NOTIFICATION ──────────────────────────
const notificationSchema = new Schema({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },  // User nhận thông báo
  type:        { type: String, enum: ['MESSAGE', 'PROJECT_ASSIGNED', 'LOGIN_FAILED', 'SYSTEM'], required: true },
  title:       { type: String, required: true },
  message:     { type: String, required: true },
  isRead:      { type: Boolean, default: false },
  readAt:      { type: Date, default: null },
  // Metadata for different notification types
  relatedId:   { type: Schema.Types.ObjectId, default: null },  // messageId, projectId, userId, etc.
  relatedType: { type: String, default: null },                 // 'MESSAGE', 'PROJECT', 'USER', etc.
  relatedData: { type: Schema.Types.Mixed, default: {} },       // Extra info (e.g., username, failed IP)
  actionUrl:   { type: String, default: null },                 // Link to navigate to
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });

// ── MESSAGE v2 (v2 RichMedia Features) ─────
const messageSchema = new Schema({
  senderId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
  channelId:   { type: Schema.Types.ObjectId, ref: 'Channel', default: null },
  
  text:        { type: String, default: '' },
  
  // ── E2E Encryption ──
  isEncrypted: { type: Boolean, default: false },          // Có mã hoá không
  encryptedText: { type: String, default: null },          // Tin nhắn mã hoá (base64)
  encryptedFor: [{                                          // Ai có thể decrypt
    userId:    { type: Schema.Types.ObjectId, ref: 'User' },
    nonce:     { type: String }                            // Unique nonce per recipient
  }],
  
  // ── Attachments (multiple files) ──
  attachments: [{
    type:       { type: String, enum: ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'], required: true },
    url:        { type: String, required: true },
    name:       { type: String, required: true },
    size:       { type: Number, required: true },
    mimeType:   { type: String, default: null },
    width:      { type: Number, default: null },    // for IMAGE/VIDEO
    height:     { type: Number, default: null },    // for IMAGE/VIDEO
    duration:   { type: Number, default: null },    // for VIDEO/AUDIO (seconds)
    thumbnail:  { type: String, default: null },    // for VIDEO
    isEncrypted: { type: Boolean, default: false }, // Attachment mã hoá
  }],
  
  // ── Reply/Thread ──
  replyTo: {
    messageId:  { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    senderId:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
    senderName: { type: String, default: null },
    text:       { type: String, default: null },     // snapshot
  },
  
  // ── Forward ──
  forwardedFrom: {
    messageId:  { type: Schema.Types.ObjectId, default: null },
    senderId:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
    senderName: { type: String, default: null },
    channelId:  { type: Schema.Types.ObjectId, default: null },
    receiverId: { type: Schema.Types.ObjectId, default: null },
  },
  
  // ── Read Receipts ──
  readBy: [{
    userId:  { type: Schema.Types.ObjectId, ref: 'User' },
    readAt:  { type: Date, default: Date.now },
  }],
  
  // ── Reactions ──
  reactions:   [{ emoji: String, users: [{ type: Schema.Types.ObjectId, ref: 'User' }] }],
  
  // ── Delete & Edit ──
  isDeleted:   { type: Boolean, default: false },
  editedAt:    { type: Date, default: null },
}, { timestamps: true });

module.exports = {
  User:        mongoose.model('User', userSchema),
  Department:  mongoose.model('Department', departmentSchema),
  Project:     mongoose.model('Project', projectSchema),
  Task:        mongoose.model('Task', taskSchema),
  TaskComment: mongoose.model('TaskComment', taskCommentSchema),
  TaskAttachment: mongoose.model('TaskAttachment', taskAttachmentSchema),
  Document:    mongoose.model('Document', documentSchema),
  Attendance:  mongoose.model('Attendance', attendanceSchema),
  SecurityLog: mongoose.model('SecurityLog', securityLogSchema),
  Channel:     mongoose.model('Channel', channelSchema),
  Message:     mongoose.model('Message', messageSchema),
  Notification: mongoose.model('Notification', notificationSchema),
};
