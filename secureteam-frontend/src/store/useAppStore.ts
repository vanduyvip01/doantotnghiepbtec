// ============================================================
//  src/store/useAppStore.ts  ← THAY THẾ FILE CŨ
// ============================================================
import { create } from 'zustand';
import { Project, Task, User, Department, Document, Attendance, SecurityLog } from '../types';
import { api } from '../api/client';

interface LoadingMap { [key: string]: boolean; }

interface AppState {
  projects:     Project[];
  tasks:        Task[];
  employees:    User[];
  departments:  Department[];
  documents:    Document[];
  attendance:   Attendance[];
  securityLogs: SecurityLog[];
  dashboardStats: any;
  currentTaskDetail: any;
  loading:      LoadingMap;
  error:        string | null;

  fetchProjects:    () => Promise<void>;
  fetchProjectReport: (projectId: string) => Promise<any>;
  fetchTasks:       (filters?: Record<string,string>) => Promise<void>;
  fetchTaskDetail:  (taskId: string) => Promise<any>;
  fetchEmployees:   (filters?: Record<string,string>) => Promise<void>;
  fetchDepartments: () => Promise<void>;
  fetchDocuments:   (projectId?: string) => Promise<void>;
  fetchAttendance:  (filters?: Record<string,string>) => Promise<void>;
  fetchSecurityLogs:() => Promise<void>;
  fetchDashboard:   () => Promise<void>;

  addProject:      (data: Partial<Project>) => Promise<void>;
  updateProject:   (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject:   (id: string) => Promise<void>;
  addTask:         (data: Partial<Task>) => Promise<void>;
  updateTaskStatus:(taskId: string, status: Task['status']) => Promise<void>;
  updateTask:      (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask:      (id: string) => Promise<void>;
  addTaskComment:  (taskId: string, text: string, mentions?: string[]) => Promise<any>;
  deleteTaskComment: (taskId: string, commentId: string) => Promise<void>;
  uploadTaskAttachment: (taskId: string, file: File) => Promise<any>;
  deleteTaskAttachment: (taskId: string, attachmentId: string) => Promise<void>;
  addEmployee:     (data: Partial<User> & { password?: string }) => Promise<void>;
  updateEmployee:  (id: string, data: Partial<User>) => Promise<void>;
  deleteEmployee:  (id: string) => Promise<void>;
  addDepartment:   (data: Partial<Department>) => Promise<void>;
  deleteDepartment:(id: string) => Promise<void>;
  uploadDocument:  (formData: FormData) => Promise<void>;
  deleteDocument:  (id: string) => Promise<void>;
  checkIn:         () => Promise<void>;
  checkOut:        () => Promise<void>;
  updateAttendance: (id: string, data: Partial<Attendance>) => Promise<void>;
  exportAttendance: (month?: string) => Promise<any>;
}

const load = (set: any, key: string, v: boolean) =>
  set((s: AppState) => ({ loading: { ...s.loading, [key]: v } }));

export const useAppStore = create<AppState>((set, get) => ({
  projects: [], tasks: [], employees: [], departments: [],
  documents: [], attendance: [], securityLogs: [], dashboardStats: null,
  currentTaskDetail: null,
  loading: {}, error: null,

  fetchProjects: async () => {
    load(set, 'projects', true);
    try {
      const data = await api.get<any[]>('/projects');
      // ✅ Normalize: Map _id to id for project and all nested objects
      const projects = data.map(p => ({
        ...p,
        id: p.id || p._id,
        managerId: typeof p.managerId === 'object' ? (p.managerId?.id || p.managerId?._id) : p.managerId,
        // ✅ CRITICAL: Map _id to id for each member object so dropdown can access member.id
        members: (p.members || []).map((member: any) => {
          if (typeof member === 'object') {
            return {
              ...member,
              id: member.id || member._id,
              // ✅ Also ensure department has id field
              department: member.department && typeof member.department === 'object' 
                ? { ...member.department, id: member.department.id || member.department._id }
                : member.department
            };
          }
          return member;
        }),
      }));
      console.log('📥 Projects fetched:', projects.map(p => ({
        id: p.id,
        name: p.name,
        members: p.members.map((m: any) => ({ id: m.id, name: m.name }))
      })));
      set({ projects });
    } catch (e: any) {
      set({ error: e.message });
    }
    finally { load(set, 'projects', false); }
  },

  fetchProjectReport: async (projectId: string) => {
    try {
      const report = await api.get<any>(`/projects/${projectId}/report`);
      return report;
    } catch (e: any) {
      throw e;
    }
  },

  fetchTasks: async (filters = {}) => {
    load(set, 'tasks', true);
    try {
      const q = new URLSearchParams(filters).toString();
      const data = await api.get<any[]>(`/tasks${q ? '?'+q : ''}`);
      // ✅ Normalize all ID fields
      const tasks = data.map(task => ({
        ...task,
        id: task.id || task._id,
        projectId: task.projectId?.id || task.projectId?._id || task.projectId,
        departmentId: task.departmentId?.id || task.departmentId?._id || task.departmentId,
        assigneeId: task.assigneeId?.id || task.assigneeId?._id || task.assigneeId,
      }));
      console.log('📥 Tasks fetched:', tasks.length, 'tasks');
      tasks.slice(0, 3).forEach(t => console.log(`  - ${t.title} (dept: ${t.departmentId}, assigned: ${t.assigneeId})`));
      set({ tasks });
    } catch (e: any) { 
      console.error('❌ fetchTasks error:', e);
      set({ error: e.message }); 
    }
    finally { load(set, 'tasks', false); }
  },

  fetchEmployees: async (filters = {}) => {
    load(set, 'employees', true);
    try {
      const q = new URLSearchParams(filters).toString();
      const data = await api.get<any[]>(`/users${q ? '?'+q : ''}`);
      // ✅ Map _id to id if needed
      const employees = data.map(emp => ({
        ...emp,
        id: emp.id || emp._id,
      }));
      console.log(`📥 Fetched ${employees.length} employees from API`);
      employees.forEach(e => {
        const deptInfo = typeof e.department === 'object' ? e.department?.name : e.department;
        console.log(`  - ${e.name} (${e.email}) -> ${deptInfo || 'No Dept'}`);
      });
      set({ employees });
    } catch (e: any) { 
      console.error('❌ fetchEmployees error:', e);
      set({ error: e.message }); 
    }
    finally { load(set, 'employees', false); }
  },

  fetchDepartments: async () => {
    load(set, 'departments', true);
    try {
      const data = await api.get<any[]>('/departments');
      // ✅ Map _id to id if needed
      const departments = data.map(dept => ({
        ...dept,
        id: dept.id || dept._id,
      }));
      console.log(`📥 Fetched ${departments.length} departments from API`);
      departments.forEach(d => console.log(`  - ${d.name} (${d.id})`));
      set({ departments });
    } catch (e: any) { 
      console.error('❌ fetchDepartments error:', e);
      set({ error: e.message }); 
    }
    finally { load(set, 'departments', false); }
  },

  fetchDocuments: async (projectId?: string) => {
    load(set, 'documents', true);
    try {
      const data = await api.get<any[]>(`/documents${projectId ? '?projectId='+projectId : ''}`);
      // ✅ Normalize all ID fields
      const documents = data.map(doc => ({
        ...doc,
        id: doc.id || doc._id,
        projectId: doc.projectId?.id || doc.projectId?._id || doc.projectId,
        departmentId: doc.departmentId?.id || doc.departmentId?._id || doc.departmentId,
        uploadedBy: doc.uploadedBy?.id || doc.uploadedBy?._id || doc.uploadedBy,
      }));
      console.log(`📥 Fetched ${documents.length} documents`);
      set({ documents });
    } catch (e: any) { 
      console.error('❌ fetchDocuments error:', e);
      set({ error: e.message }); 
    }
    finally { load(set, 'documents', false); }
  },

  fetchAttendance: async (filters = {}) => {
    load(set, 'attendance', true);
    try {
      const q = new URLSearchParams(filters).toString();
      const data = await api.get<any[]>(`/attendance${q ? '?'+q : ''}`);
      const attendance = data.map(att => ({
        ...att,
        id: att.id || att._id,
      }));
      console.log(`📥 Fetched ${attendance.length} attendance records:`, attendance.slice(0, 3));
      set({ attendance });
    } catch (e: any) { 
      console.error('❌ fetchAttendance error:', e);
      set({ error: e.message }); 
    }
    finally { load(set, 'attendance', false); }
  },

  fetchSecurityLogs: async () => {
    load(set, 'securityLogs', true);
    try { set({ securityLogs: await api.get<SecurityLog[]>('/security') }); }
    catch (e: any) { set({ error: e.message }); }
    finally { load(set, 'securityLogs', false); }
  },

  fetchDashboard: async () => {
    try { set({ dashboardStats: await api.get('/dashboard/stats') }); }
    catch {}
  },

  addProject: async (data) => {
    const p = await api.post<any>('/projects', data);
    // ✅ Normalize project data
    const project = {
      ...p,
      id: p.id || p._id,
      managerId: typeof p.managerId === 'object' ? p.managerId : p.managerId,
      members: (p.members || []).map((m: any) => typeof m === 'object' ? m : m)
    };
    set(s => ({ projects: [project, ...s.projects] }));
    return project;
  },
  updateProject: async (id, data) => {
    const p = await api.put<any>(`/projects/${id}`, data);
    // ✅ Normalize project data
    const project = {
      ...p,
      id: p.id || p._id,
      managerId: typeof p.managerId === 'object' ? p.managerId : p.managerId,
      members: (p.members || []).map((m: any) => typeof m === 'object' ? m : m)
    };
    set(s => ({ projects: s.projects.map(x => x.id === id ? project : x) }));
  },
  deleteProject: async (id) => {
    await api.delete(`/projects/${id}`);
    set(s => ({ projects: s.projects.filter(x => x.id !== id) }));
  },

  addTask: async (data) => {
    const t = await api.post<any>('/tasks', data);
    // ✅ Normalize task data
    const task = {
      ...t,
      id: t.id || t._id,
      assigneeId: typeof t.assigneeId === 'object' ? t.assigneeId : t.assigneeId,
      projectId: typeof t.projectId === 'object' ? t.projectId : t.projectId
    };
    set(s => ({ tasks: [task, ...s.tasks] }));
  },
  updateTaskStatus: async (taskId, status) => {
    const t = await api.patch<Task>(`/tasks/${taskId}/status`, { status });
    set(s => ({ tasks: s.tasks.map(x => x.id === taskId ? t : x) }));
    // Refresh tasks to update project progress
    await get().fetchTasks();
  },
  
  fetchTaskDetail: async (taskId: string) => {
    try {
      const detail = await api.get<any>(`/tasks/${taskId}`);
      set({ currentTaskDetail: { ...detail, id: detail.id || detail._id } });
      return detail;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  updateTask: async (id, data) => {
    const t = await api.put<Task>(`/tasks/${id}`, data);
    set(s => ({ tasks: s.tasks.map(x => x.id === id ? t : x) }));
  },

  addTaskComment: async (taskId, text, mentions) => {
    const comment = await api.post<any>(`/tasks/${taskId}/comments`, { text, mentions });
    return { ...comment, id: comment.id || comment._id };
  },

  deleteTaskComment: async (taskId, commentId) => {
    await api.delete(`/tasks/${taskId}/comments/${commentId}`);
  },

  uploadTaskAttachment: async (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const attachment = await api.post<any>(`/tasks/${taskId}/attachments`, formData);
    return { ...attachment, id: attachment.id || attachment._id };
  },

  deleteTaskAttachment: async (taskId, attachmentId) => {
    await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
  },

  deleteTask: async (id) => {
    await api.delete(`/tasks/${id}`);
    set(s => ({ tasks: s.tasks.filter(x => x.id !== id) }));
  },

  addEmployee: async (data) => {
    const u = await api.post<any>('/users', data);
    // ✅ Ensure id is set from _id and include 2FA secret
    const employee = { 
      ...u, 
      id: u.id || u._id,
      twoFactorSecret: u.twoFactorSecret, // Keep 2FA secret
    };
    set(s => ({ employees: [employee, ...s.employees] }));
  },
  updateEmployee: async (id, data) => {
    const u = await api.put<any>(`/users/${id}`, data);
    // ✅ Ensure id is set from _id
    const employee = { ...u, id: u.id || u._id };
    set(s => ({ employees: s.employees.map(x => x.id === id ? employee : x) }));
  },
  deleteEmployee: async (id) => {
    await api.delete(`/users/${id}`);
    set(s => ({ employees: s.employees.filter(x => x.id !== id) }));
  },

  addDepartment: async (data) => {
    const d = await api.post<Department>('/departments', data);
    set(s => ({ departments: [...s.departments, d] }));
  },
  deleteDepartment: async (id) => {
    await api.delete(`/departments/${id}`);
    set(s => ({ departments: s.departments.filter(x => x.id !== id) }));
  },

  uploadDocument: async (formData) => {
    const doc = await api.upload<Document>('/documents', formData);
    set(s => ({ documents: [doc, ...s.documents] }));
  },
  deleteDocument: async (id) => {
    await api.delete(`/documents/${id}`);
    set(s => ({ documents: s.documents.filter(x => x.id !== id) }));
  },

  checkIn: async () => {
    const r = await api.post<Attendance>('/attendance/check-in', {});
    set(s => {
      const exists = s.attendance.find(a => a.id === r.id);
      return { attendance: exists ? s.attendance.map(a => a.id === r.id ? r : a) : [r, ...s.attendance] };
    });
  },
  checkOut: async () => {
    const r = await api.post<Attendance>('/attendance/check-out', {});
    set(s => ({ attendance: s.attendance.map(a => a.id === r.id ? r : a) }));
  },

  updateAttendance: async (id, data) => {
    const updated = await api.put<Attendance>(`/attendance/${id}`, data);
    set(s => ({
      attendance: s.attendance.map(a => a.id === id ? updated : a)
    }));
  },

  exportAttendance: async (month?: string) => {
    const report = await api.get<any>(`/attendance/report/export${month ? '?month=' + month : ''}`);
    return report;
  },
}));
