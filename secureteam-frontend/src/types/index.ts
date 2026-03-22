export type Role = 'ADMIN' | 'PM' | 'MEMBER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  status: UserStatus;
  avatar?: string;
  lastLogin?: string;
  ipAddress?: string;
  device?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
}

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';

export interface Project {
  id: string;
  name: string;
  description: string;
  managerId: string;
  members: string[];
  departmentId: string;
  status: ProjectStatus;
  progress: number;
  deadline: string;
  createdAt: string;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';

export interface Task {
  id: string;
  projectId: string;
  departmentId: string;
  title: string;
  description: string;
  assigneeId: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  employeeCount: number;
}

export interface Document {
  id: string;
  name: string;
  projectId: string;
  uploadedBy: string;
  uploadDate: string;
  size: string;
  type: string;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'HALF_DAY';
}

export interface SecurityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  device: string;
  status: 'SUCCESS' | 'FAILED';
}

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string; // For DM
  channelId?: string; // For Group
  text: string;
  timestamp: string;
  reactions?: { emoji: string; count: number; users: string[] }[];
}
