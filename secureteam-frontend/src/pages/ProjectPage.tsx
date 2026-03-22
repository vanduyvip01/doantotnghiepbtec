import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, BarChart3, TrendingUp, AlertCircle, FileText, Download, Upload } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { cn } from '../utils/cn';
import { api } from '../api/client';

export const ProjectPage = () => {
  const { user } = useAuthStore();
  const { projects, employees, tasks, documents, departments, addProject, updateProject, deleteProject, fetchProjects, fetchTasks, addTask, updateTask, deleteTask, fetchProjectReport, fetchDocuments, uploadDocument, deleteDocument, fetchDepartments, fetchEmployees } = useAppStore();
  
  // State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [projectReport, setProjectReport] = useState<any>(null);
  const [documentForm, setDocumentForm] = useState({ file: null as File | null, projectId: '' });
  const [selectedDepartmentForCreate, setSelectedDepartmentForCreate] = useState<string>('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('');
  
  const [createForm, setCreateForm] = useState({ 
    name: '', 
    description: '', 
    managerId: '', 
    members: [] as string[],
    deadline: '' 
  });
  
  const [taskForm, setTaskForm] = useState({ 
    title: '', 
    description: '', 
    assigneeId: '', 
    priority: 'MEDIUM', 
    deadline: '' 
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchTasks();
    fetchDocuments();
    fetchDepartments();
    fetchEmployees();
  }, []);

  // ── ACCESS CONTROL ────────────────────────────────────
  const isAdmin = user?.role === 'ADMIN';
  const isPM = user?.role === 'PM';
  const isMember = user?.role === 'MEMBER';
  
  const canCreateProject = isAdmin;
  const canDeleteProject = isAdmin;
  const canEditProject = (project: any) => isAdmin || (isPM && user?.id === project?.managerId);
  const canManageMembers = (project: any) => canEditProject(project);
  const canCreateTasks = (project: any) => canEditProject(project);
  const isProjectMember = (project: any) => project?.members?.includes(user?.id);
  const isProjectManager = (project: any) => isPM && user?.id === project?.managerId;

  // ── HELPERS ────────────────────────────────────
  const getDeadlineStatus = (deadline: string, progress: number) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    if (progress === 100) return { status: 'completed', label: '✅ Hoàn thành', color: 'bg-green-100 text-green-700' };
    if (now > deadlineDate) return { status: 'overdue', label: '⚠️ Đã quá hạn', color: 'bg-red-100 text-red-700' };
    return { status: 'in_progress', label: '⏳ Đang làm', color: 'bg-blue-100 text-blue-700' };
  };

  // Helper to get ID from member (could be string ID or object with _id/id)
  const getMemberId = (member: any): string => {
    if (typeof member === 'string') return member;
    return member?.id || member?._id || '';
  };

  // Helper to get name from member (could be string ID or object with name)
  const getMemberNameFromData = (member: any): string => {
    if (typeof member === 'string') return employees.find(e => e.id === member)?.name || 'Unknown';
    return member?.name || 'Unknown';
  };

  const getMemberProgress = (projectId: string, memberId: string) => {
    const memberTasks = tasks.filter(t => t.projectId === projectId && getMemberId(t.assigneeId) === memberId);
    if (memberTasks.length === 0) return 0;
    return Math.round((memberTasks.filter(t => t.status === 'COMPLETED').length / memberTasks.length) * 100);
  };

  const getEmployeesByDepartment = () => {
    const grouped: { [key: string]: typeof employees } = {};
    const members = employees.filter(e => e.role === 'MEMBER');
    
    members.forEach(member => {
      const deptId = typeof member.department === 'string' ? member.department : member.department?.id || member.department?._id;
      const deptName = departments.find(d => d.id === deptId)?.name || 'No Department';
      
      if (!grouped[deptName]) {
        grouped[deptName] = [];
      }
      grouped[deptName].push(member);
    });
    
    return grouped;
  };

  const getProjectsByDepartment = () => {
    const grouped: { [key: string]: { pm: any; members: typeof employees; deptId: string; projects: typeof projects } } = {};
    
    projects.forEach(project => {
      const pm = employees.find(e => e.id === project.managerId);
      const pmDeptId = typeof pm?.department === 'string' ? pm?.department : pm?.department?.id || pm?.department?._id;
      const deptName = departments.find(d => d.id === pmDeptId)?.name || 'No Department';
      
      if (!grouped[deptName]) {
        const deptMembers = employees.filter(e => {
          if (e.role !== 'MEMBER') return false;
          const memberDeptId = typeof e.department === 'string' ? e.department : e.department?.id || e.department?._id;
          return memberDeptId === pmDeptId;
        });
        
        grouped[deptName] = {
          pm,
          members: deptMembers,
          deptId: pmDeptId || '',
          projects: []
        };
      }
      grouped[deptName].projects.push(project);
    });
    
    return grouped;
  };

  const getPMsByDepartment = (deptId: string) => {
    return employees.filter(e => {
      if (e.role !== 'PM') return false;
      const pmDeptId = typeof e.department === 'string' ? e.department : e.department?.id || e.department?._id;
      return pmDeptId === deptId;
    });
  };

  const getMembersByDepartment = (deptId: string) => {
    return employees.filter(e => {
      if (e.role !== 'MEMBER') return false;
      const memberDeptId = typeof e.department === 'string' ? e.department : e.department?.id || e.department?._id;
      return memberDeptId === deptId;
    });
  };

  const getPMAndMembersByDepartment = (deptId: string) => {
    return { 
      pms: getPMsByDepartment(deptId), 
      members: getMembersByDepartment(deptId)
    };
  };

  const getProjectMembersByDepartment = (project: any) => {
    const grouped: { [key: string]: any[] } = {};
    
    // ✅ project.members is already populated with full user objects from backend
    if (!project || !project.members || project.members.length === 0) {
      console.warn('⚠️ No project or members available');
      return grouped;
    }
    
    project.members.forEach((member: any) => {
      if (!member) return;
      
      // ✅ Member already has department info from backend populate
      const deptName = member.department?.name || 'No Department';
      
      if (!grouped[deptName]) {
        grouped[deptName] = [];
      }
      grouped[deptName].push(member);
    });
    
    console.log('✅ Grouped members by department:', { projectId: project.id, grouped });
    return grouped;
  };

  const getProjectProgress = (projectId: string) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    // Count tasks that are REVIEW or COMPLETED as submitted/done
    const completedTasks = projectTasks.filter(t => t.status === 'REVIEW' || t.status === 'COMPLETED').length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  };

  const getProjectTasks = (projectId: string) => tasks.filter(t => t.projectId === projectId);

  const getMemberName = (id?: string) => employees.find(e => e.id === id)?.name || 'Unknown';

  // ── CREATE PROJECT ────────────────────────────────────
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const newProject = await addProject({
        name: createForm.name,
        description: createForm.description,
        managerId: createForm.managerId,
        members: createForm.members,
        departmentId: selectedDepartmentForCreate,
        deadline: createForm.deadline,
        status: 'PLANNING',
        progress: 0,
      });
      
      await fetchProjects();
      setCreateForm({ name: '', description: '', managerId: '', members: [], deadline: '' });
      setSelectedDepartmentForCreate('');
      setIsCreateModalOpen(false);

      // Auto-open task assignment
      if (createForm.members.length > 0) {
        setSelectedProject(newProject);
        setIsTaskModalOpen(true);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── EDIT PROJECT ────────────────────────────────────
  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    setError('');
    setIsLoading(true);
    try {
      await updateProject(editForm.id, {
        name: editForm.name,
        description: editForm.description,
        managerId: editForm.managerId,
        members: editForm.members,
        deadline: editForm.deadline,
        status: editForm.status,
      });
      await fetchProjects();
      setIsEditModalOpen(false);
      setEditForm(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── VIEW PROJECT REPORT (PM & ADMIN) ────────────────────────────────
  const handleViewReport = async (projectId: string) => {
    setError('');
    setIsLoading(true);
    try {
      const report = await fetchProjectReport(projectId);
      setProjectReport(report);
      setIsReportModalOpen(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── ADD TASK ────────────────────────────────────
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setError('');
    setIsLoading(true);
    try {
      // ✅ Validate assigneeId before sending
      if (taskForm.assigneeId && !/^[a-f\d]{24}$/i.test(taskForm.assigneeId)) {
        throw new Error(`❌ Invalid Member ID: "${taskForm.assigneeId}" - expected ObjectId format`);
      }
      
      console.log('📤 Creating task with assigneeId:', taskForm.assigneeId);
      await addTask({
        projectId: selectedProject.id,
        departmentId: typeof selectedProject.departmentId === 'string' 
          ? selectedProject.departmentId 
          : selectedProject.departmentId?.id || selectedProject.departmentId?._id || '',
        title: taskForm.title,
        description: taskForm.description,
        assigneeId: taskForm.assigneeId || null,
        priority: taskForm.priority,
        deadline: taskForm.deadline,
        status: 'TODO',
      });
      await fetchTasks();
      setTaskForm({ title: '', description: '', assigneeId: '', priority: 'MEDIUM', deadline: '' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── DELETE TASK ────────────────────────────────────
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(taskId);
      await fetchTasks();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ── DELETE PROJECT ────────────────────────────────────
  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Delete this project? This action cannot be undone.')) return;
    try {
      await deleteProject(projectId);
      await fetchProjects();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ── UPLOAD DOCUMENT ────────────────────────────────────
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentForm.file || !selectedProject) return;
    setError('');
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', documentForm.file);
      formData.append('projectId', selectedProject.id);
      
      await uploadDocument(formData);
      await fetchDocuments(selectedProject.id);
      
      setDocumentForm({ file: null, projectId: '' });
      setError('');
      alert('📄 Document uploaded successfully!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── DELETE DOCUMENT ────────────────────────────────────
  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await deleteDocument(docId);
      await fetchDocuments(selectedProject?.id);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ── GET PROJECT DOCUMENTS ────────────────────────────────────
  const getProjectDocuments = (projectId: string) => {
    return documents.filter(doc => doc.projectId === projectId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500">Track and manage your team's initiatives.</p>
        </div>
        {canCreateProject && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center">
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        )}
      </div>

      <div className="space-y-8">
        {/* Department Filter Buttons */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Phòng ban</p>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setSelectedDepartmentFilter('')}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                selectedDepartmentFilter === '' 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
              Tất cả
            </button>
            {departments.map(dept => (
              <button
                key={dept.id}
                onClick={() => setSelectedDepartmentFilter(dept.id)}
                className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                  selectedDepartmentFilter === dept.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
                {dept.name}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grouped by Department */}
        {Object.entries(getProjectsByDepartment())
          .filter(([_, deptInfo]) => selectedDepartmentFilter === '' || deptInfo.deptId === selectedDepartmentFilter)
          .map(([deptName, deptInfo]) => (
          <div key={deptName} className="border border-slate-200 rounded-lg p-6 bg-slate-50">
            {/* Department Header */}
            <div className="mb-6 pb-4 border-b-2 border-indigo-300">
              <h2 className="text-xl font-bold text-slate-900 mb-3">{deptName}</h2>
              
              {/* PM Info */}
              {deptInfo.pm && (
                <div className="bg-white rounded-lg p-3 border border-indigo-200 mb-3">
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">👨‍💼 PM (Quản lý phòng ban)</p>
                  <p className="text-sm font-medium text-slate-900">{deptInfo.pm.name}</p>
                  <p className="text-xs text-slate-500">{deptInfo.pm.email}</p>
                </div>
              )}
              
              {/* Department Members */}
              {deptInfo.members.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">👥 Thành viên phòng ban ({deptInfo.members.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {deptInfo.members.map(member => (
                      <span key={member.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {member.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deptInfo.projects.length > 0 ? (
                deptInfo.projects.map((project) => {
                  const canEdit = canEditProject(project);
                  const projectProgress = getProjectProgress(project.id);
                  const deadlineInfo = getDeadlineStatus(project.deadline, projectProgress);
                  
                  return (
                    <Card key={project.id} className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", 
                          project.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                        )}>
                          {project.status}
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {(canEdit || isAdmin) && (
                            <button onClick={() => handleViewReport(project.id)} className="p-1 hover:bg-blue-50 rounded text-slate-500 hover:text-blue-600" title="View Report">
                              <BarChart3 className="w-4 h-4" />
                            </button>
                          )}
                          {canEdit && (
                            <button onClick={() => {
                              // ✅ Normalize departmentId for edit form
                              const deptId = typeof project.departmentId === 'string' 
                                ? project.departmentId 
                                : project.departmentId?.id || project.departmentId?._id || '';
                              setEditForm({...project, departmentId: deptId});
                              setIsEditModalOpen(true);
                            }} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteProject && (
                            <button onClick={() => handleDeleteProject(project.id)} className="p-1 hover:bg-red-50 rounded text-slate-500 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 mb-2 cursor-pointer hover:text-indigo-600" 
                        onClick={() => {
                          setSelectedProject(project);
                          setIsDetailModalOpen(true);
                        }}>
                        {project.name}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{project.description}</p>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-500">Progress</span>
                            <span className="text-slate-700">{projectProgress}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${projectProgress}%` }} />
                          </div>
                        </div>

                        <div className={cn('px-2 py-1 rounded text-xs font-medium text-center', deadlineInfo.color)}>
                          {deadlineInfo.label}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="flex -space-x-2">
                            {project.members.slice(0, 3).map((member: any) => {
                              const name = getMemberNameFromData(member);
                              return (
                                <div key={getMemberId(member)} className="w-7 h-7 rounded-full border-2 border-white bg-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-600" title={name}>
                                  {name.charAt(0)}
                                </div>
                              );
                            })}
                            {project.members.length > 3 && <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500">+{project.members.length - 3}</div>}
                          </div>
                          <span className="text-xs text-slate-500">{new Date(project.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-8 text-slate-500">
                  <p className="text-sm">Chưa có dự án nào</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════ PROJECT DETAIL MODAL */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={selectedProject?.name}>
        {selectedProject && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-slate-600 mb-2">Description</p>
              <p className="text-slate-700">{selectedProject.description}</p>
            </div>

            <div>
              <p className="text-sm text-slate-600 mb-2 font-medium">Progress: {getProjectProgress(selectedProject.id)}%</p>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${getProjectProgress(selectedProject.id)}%` }} />
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Team Members ({selectedProject.members.length})</h4>
              <div className="space-y-2">
                {selectedProject.members.map((memberId: string) => {
                  const id = getMemberId(memberId);
                  const prog = getMemberProgress(selectedProject.id, id);
                  const memberTasks = getProjectTasks(selectedProject.id).filter(t => getMemberId(t.assigneeId) === id);
                  return (
                    <div key={id} className="p-2 bg-slate-50 rounded border border-slate-200">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-slate-700">{getMemberNameFromData(memberId)}</span>
                        <span className="text-sm text-indigo-600 font-semibold">{prog}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1">
                        <div className={cn('h-full rounded-full', prog === 100 ? 'bg-green-500' : 'bg-blue-500')} style={{ width: `${prog}%` }} />
                      </div>
                      <p className="text-xs text-slate-500">{memberTasks.length} tasks assigned</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-slate-900">Tasks ({getProjectTasks(selectedProject.id).length})</h4>
                {canEditProject(selectedProject) && (
                  <button onClick={() => setIsTaskModalOpen(true)} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                    + Add Task
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getProjectTasks(selectedProject.id).map((task: any) => (
                  <div key={task.id} className="p-2 bg-slate-50 rounded border border-slate-200 flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 line-clamp-1">{task.title}</p>
                      <p className="text-xs text-slate-500">{getMemberNameFromData(task.assigneeId)} • {task.status}</p>
                    </div>
                    {canEditProject(selectedProject) && (
                      <button onClick={() => handleDeleteTask(task.id)} className="ml-2 text-red-500 hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Documents ({getProjectDocuments(selectedProject.id).length})
                </h4>
                {canEditProject(selectedProject) && (
                  <button onClick={() => {
                    setDocumentForm({ ...documentForm, projectId: selectedProject.id });
                    setIsDocumentModalOpen(true);
                  }} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Upload
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getProjectDocuments(selectedProject.id).length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No documents uploaded yet</p>
                ) : (
                  getProjectDocuments(selectedProject.id).map((doc: any) => (
                    <div key={doc.id} className="p-2 bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 line-clamp-1">{doc.name}</p>
                          <p className="text-xs text-slate-500">{getMemberName(doc.uploadedBy?.id || doc.uploadedBy)} • {(doc.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => {
                          const link = document.createElement('a');
                          link.href = doc.fileUrl;
                          link.download = doc.name;
                          link.click();
                        }} className="p-1 text-blue-500 hover:bg-blue-100 rounded">
                          <Download className="w-3 h-3" />
                        </button>
                        {canEditProject(selectedProject) && (
                          <button onClick={() => handleDeleteDocument(doc.id)} className="p-1 text-red-500 hover:bg-red-100 rounded">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {canEditProject(selectedProject) && (
                <Button variant="outline" onClick={() => {
                  // ✅ Normalize departmentId for edit form
                  const deptId = typeof selectedProject.departmentId === 'string' 
                    ? selectedProject.departmentId 
                    : selectedProject.departmentId?.id || selectedProject.departmentId?._id || '';
                  setEditForm({...selectedProject, departmentId: deptId});
                  setIsEditModalOpen(true);
                  setIsDetailModalOpen(false);
                }}>Edit Project</Button>
              )}
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)} className="flex-1">Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════ CREATE PROJECT MODAL */}
      <Modal isOpen={isCreateModalOpen} onClose={() => {
        setIsCreateModalOpen(false);
        setSelectedDepartmentForCreate('');
        setCreateForm({ name: '', description: '', managerId: '', members: [], deadline: '' });
      }} title="Create New Project">
        <form onSubmit={handleCreateProject} className="space-y-4">
          {/* Select Department First */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Phòng ban <span className="text-red-500">*</span></label>
            <select 
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
              value={selectedDepartmentForCreate} 
              onChange={(e) => {
                setSelectedDepartmentForCreate(e.target.value);
                if (e.target.value) {
                  const { members } = getPMAndMembersByDepartment(e.target.value);
                  setCreateForm({
                    name: '',
                    description: '',
                    managerId: '',
                    members: members.map(m => m.id),
                    deadline: ''
                  });
                }
              }} 
              required>
              <option value="">-- Chọn phòng ban --</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          {selectedDepartmentForCreate && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Project Manager <span className="text-red-500">*</span></label>
                <select className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={createForm.managerId} onChange={(e) => setCreateForm({...createForm, managerId: e.target.value})} required>
                  <option value="">-- Chọn PM --</option>
                  {getPMAndMembersByDepartment(selectedDepartmentForCreate).pms.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name} ({pm.email})</option>
                  ))}
                </select>
              </div>

              <Input label="Project Name" placeholder="e.g. Mobile App Redesign" required value={createForm.name} onChange={(e) => setCreateForm({...createForm, name: e.target.value})} />
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea className="w-full min-h-[80px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="What is this project about?" value={createForm.description} onChange={(e) => setCreateForm({...createForm, description: e.target.value})} />
              </div>

              <Input label="Deadline" type="date" required value={createForm.deadline} onChange={(e) => setCreateForm({...createForm, deadline: e.target.value})} />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Team Members</label>
                <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {getMembersByDepartment(selectedDepartmentForCreate).map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={createForm.members.includes(emp.id)} onChange={(e) => {
                        const newMembers = e.target.checked ? [...createForm.members, emp.id] : createForm.members.filter(id => id !== emp.id);
                        setCreateForm({...createForm, members: newMembers});
                      }} />
                      <span className="text-sm">{emp.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => {
              setIsCreateModalOpen(false);
              setSelectedDepartmentForCreate('');
              setCreateForm({ name: '', description: '', managerId: '', members: [], deadline: '' });
            }}>Cancel</Button>
            <Button type="submit" isLoading={isLoading} disabled={!selectedDepartmentForCreate}>Create Project</Button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════ EDIT PROJECT MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Project">
        {editForm && (
          <form onSubmit={handleEditProject} className="space-y-4">
            {isAdmin && (
              <>
                <Input label="Project Name" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <textarea className="w-full min-h-[80px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Status</label>
                    <select className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})}>
                      <option value="PLANNING">Planning</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  <Input label="Deadline" type="date" value={editForm.deadline} onChange={(e) => setEditForm({...editForm, deadline: e.target.value})} />
                </div>
              </>
            )}

            {isPM && (
              <>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                  ℹ️ As Project Manager, you can manage team members and update project status.
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})}>
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Team Members</label>
              <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {editForm && getMembersByDepartment(editForm.departmentId || '').map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.members.includes(emp.id)} onChange={(e) => {
                      const newMembers = e.target.checked ? [...editForm.members, emp.id] : editForm.members.filter((id: string) => id !== emp.id);
                      setEditForm({...editForm, members: newMembers});
                    }} />
                    <span className="text-sm">{emp.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={isLoading}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════ TASK ASSIGNMENT MODAL */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Assign Tasks">
        {selectedProject && (
          <form onSubmit={handleAddTask} className="space-y-4">
            <Input label="Task Title" placeholder="e.g. Design UI mockups" required value={taskForm.title} onChange={(e) => setTaskForm({...taskForm, title: e.target.value})} />
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <textarea className="w-full min-h-[60px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Task details..." value={taskForm.description} onChange={(e) => setTaskForm({...taskForm, description: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Assign to</label>
                <select className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={taskForm.assigneeId} onChange={(e) => setTaskForm({...taskForm, assigneeId: e.target.value})} required>
                  <option value="">Select Member</option>
                  {Object.entries(getProjectMembersByDepartment(selectedProject)).map(([deptName, members]) => (
                    <optgroup key={deptName} label={deptName}>
                        {members.map((member: any) => {
                          const memberId = member.id || member._id;
                          return <option key={memberId} value={memberId}>{member.name}</option>;
                        })}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Priority</label>
                <select className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={taskForm.priority} onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <Input label="Deadline" type="date" value={taskForm.deadline} onChange={(e) => setTaskForm({...taskForm, deadline: e.target.value})} />

            {error && <p className="text-sm text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={() => setIsTaskModalOpen(false)}>Done</Button>
              <Button type="submit" isLoading={isLoading}>Add Task</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════ PROJECT REPORT MODAL */}
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title={`📊 ${projectReport?.project?.name || 'Project'} Report`}>
        {projectReport && (
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {/* Summary */}
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-sm text-indigo-900 font-medium">{projectReport?.summary?.message}</p>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-600 font-semibold mb-1">OVERALL PROGRESS</p>
                <p className="text-2xl font-bold text-blue-900">{projectReport?.overview?.overallProgress}%</p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-xs text-green-600 font-semibold mb-1">TASKS COMPLETED</p>
                <p className="text-2xl font-bold text-green-900">{projectReport?.overview?.completedTasks}/{projectReport?.overview?.totalTasks}</p>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                <p className="text-xs text-purple-600 font-semibold mb-1">IN PROGRESS</p>
                <p className="text-2xl font-bold text-purple-900">{projectReport?.overview?.inProgressTasks}</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                <p className="text-xs text-amber-600 font-semibold mb-1">TODO</p>
                <p className="text-2xl font-bold text-amber-900">{projectReport?.overview?.todoTasks}</p>
              </div>
            </div>

            {/* Risk Assessment */}
            {projectReport?.riskAssessment?.overdueTasks > 0 && (
              <div className="p-3 bg-red-50 border border-red-300 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-900 mb-2">⚠️ {projectReport?.riskAssessment?.overdueTasks} Overdue Tasks</p>
                    <div className="space-y-1">
                      {projectReport?.riskAssessment?.overdueTasksList?.slice(0, 3).map((task: any) => (
                        <p key={task.id} className="text-xs text-red-800">• {task.title} ({task.assignee})</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {projectReport?.riskAssessment?.urgentTasks > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-300 rounded">
                <p className="text-sm font-semibold text-orange-900 mb-2">🔴 {projectReport?.riskAssessment?.urgentTasks} Urgent Tasks</p>
                <div className="space-y-1">
                  {projectReport?.riskAssessment?.urgentTasksList?.slice(0, 3).map((task: any) => (
                    <p key={task.id} className="text-xs text-orange-800">• {task.title} ({task.status})</p>
                  ))}
                </div>
              </div>
            )}

            {/* Team Performance */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Team Performance
              </h4>
              <div className="space-y-2">
                {projectReport?.teamPerformance?.map((member: any) => (
                  <div key={member.memberId} className="p-2 bg-slate-50 rounded border border-slate-200">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{member.name}</span>
                      <span className="text-xs font-semibold text-indigo-600">{member.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', member.progress === 100 ? 'bg-green-500' : 'bg-blue-500')} style={{ width: `${member.progress}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{member.completedTasks}/{member.totalTasks} tasks completed</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsReportModalOpen(false)} className="flex-1">Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════ UPLOAD DOCUMENT MODAL */}
      <Modal isOpen={isDocumentModalOpen} onClose={() => setIsDocumentModalOpen(false)} title="Upload Document">
        {selectedProject && (
          <form onSubmit={handleUploadDocument} className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-900">📄 Uploading to: <strong>{selectedProject.name}</strong></p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}>
              <input 
                id="file-input"
                type="file" 
                hidden 
                onChange={(e) => setDocumentForm({...documentForm, file: e.target.files?.[0] || null})}
              />
              <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-700 mb-1">
                {documentForm.file ? documentForm.file.name : 'Click to select or drag file'}
              </p>
              <p className="text-xs text-slate-500">PDF, Word, Excel, Image (Max 20MB)</p>
            </div>

            {documentForm.file && (
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <p className="text-xs text-slate-600">Selected: <strong>{documentForm.file.name}</strong> ({(documentForm.file.size / 1024).toFixed(1)} KB)</p>
              </div>
            )}

            {error && <p className="text-sm text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={() => setIsDocumentModalOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={isLoading} disabled={!documentForm.file}>Upload Document</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
