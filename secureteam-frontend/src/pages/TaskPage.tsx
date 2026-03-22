import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, CheckCircle, PlayCircle, Trash2, Upload, Download, MessageSquare, FileText, Send, Flag, Clock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Card } from '../components/Card';
import { cn } from '../utils/cn';
import { TaskStatus, TaskPriority } from '../types';

const COLUMNS: { title: string; status: TaskStatus }[] = [
  { title: 'To Do',       status: 'TODO'        },
  { title: 'In Progress', status: 'IN_PROGRESS'  },
  { title: 'Review',      status: 'REVIEW'       },
  { title: 'Completed',   status: 'COMPLETED'    },
];

export const TaskPage = () => {
  const { user } = useAuthStore();
  const { tasks, projects, employees, departments, fetchTasks, fetchDepartments, fetchProjects, fetchEmployees, updateTaskStatus, addTask, deleteTask, fetchTaskDetail, currentTaskDetail, addTaskComment, deleteTaskComment, uploadTaskAttachment, deleteTaskAttachment } = useAppStore();
  
  // State
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', description: '', projectId: '', assigneeId: '', priority: 'MEDIUM' as TaskPriority, deadline: '' });
  const [commentText, setCommentText] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { 
    fetchTasks();
    fetchDepartments();
    fetchProjects();
    fetchEmployees();
  }, []);

  const canManage = user?.role === 'ADMIN' || user?.role === 'PM';

  const getAssigneeId = (assignee: any): string => {
    if (typeof assignee === 'string') return assignee;
    return assignee?.id || assignee?._id || '';
  };

  const getAssigneeName = (assignee: any): string => {
    if (typeof assignee === 'string') return employees.find(e => e.id === assignee)?.name || 'Unassigned';
    return assignee?.name || 'Unassigned';
  };

  // ✅ Helper to get task visibility based on role
  const isTaskVisible = (task: any): boolean => {
    if (!user) return false;
    
    if (user.role === 'ADMIN') {
      // ADMIN sees all tasks
      return true;
    } else if (user.role === 'PM') {
      // PM sees:
      // 1. Tasks from projects they manage
      // 2. Tasks assigned to them
      const managedProject = projects.find(p => {
        const pManagerId = typeof p.managerId === 'string' ? p.managerId : (p.managerId as any)?.id || (p.managerId as any)?._id;
        return (pManagerId === user.id) && p.id === task.projectId;
      });
      const isAssigned = getAssigneeId(task.assigneeId) === user.id;
      return !!managedProject || isAssigned;
    } else if (user.role === 'MEMBER') {
      // MEMBER sees only tasks assigned to them
      return getAssigneeId(task.assigneeId) === user.id;
    }
    return false;
  };

  const getProjectMembersByDepartment = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    
    // ✅ project.members is already populated with full user objects from backend
    if (!project || !project.members || project.members.length === 0) {
      console.warn('⚠️ TaskPage: No project or members available', { projectId, project });
      return {};
    }
    
    const grouped: { [key: string]: any[] } = {};
    
    project.members.forEach((member: any) => {
      if (!member) return;
      
      // ✅ Member already has department info from backend populate
      const deptName = member.department?.name || 'No Department';
      
      if (!grouped[deptName]) {
        grouped[deptName] = [];
      }
      grouped[deptName].push(member);
    });
    
    console.log('✅ TaskPage: Members grouped by department:', { projectId, grouped });
    return grouped;
  };

  // ── TASK DETAIL MODAL ────────────────────────
  const handleOpenTaskDetail = async (task: any) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
    try {
      await fetchTaskDetail(task.id);
    } catch (e: any) {
      console.error('Error fetching task detail:', e);
    }
  };

  // ── DRAG & DROP ────────────────────────
  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    if (!canManage) return;
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    updateTaskStatus(taskId, status);
  };

  // ── CREATE TASK ────────────────────────
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId) {
      setError('Please select a project');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      // ✅ Validate assigneeId format before sending
      if (formData.assigneeId && !/^[a-f\d]{24}$/i.test(formData.assigneeId)) {
        throw new Error(`❌ Invalid Member ID: "${formData.assigneeId}" - expected ObjectId format`);
      }
      
      // ✅ Get the selected project to extract departmentId
      const selectedProject = projects.find(p => p.id === formData.projectId);
      const deptId = selectedProject 
        ? (typeof selectedProject.departmentId === 'string' 
            ? selectedProject.departmentId 
            : (selectedProject.departmentId as any)?.id || (selectedProject.departmentId as any)?._id || '')
        : '';

      console.log('📤 Creating task with assigneeId:', formData.assigneeId);
      await addTask({
        projectId: formData.projectId,
        departmentId: deptId,
        title: formData.title,
        description: formData.description,
        assigneeId: formData.assigneeId || null,
        priority: formData.priority,
        deadline: formData.deadline || null,
        status: 'TODO',
      });
      await fetchTasks();
      setIsCreateModalOpen(false);
      setFormData({ title: '', description: '', projectId: '', assigneeId: '', priority: 'MEDIUM', deadline: '' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── ADD COMMENT ────────────────────────
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;
    setIsLoading(true);
    try {
      await addTaskComment(selectedTask.id, commentText);
      await fetchTaskDetail(selectedTask.id);
      setCommentText('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── DELETE COMMENT ────────────────────────
  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('Delete this comment?')) {
      try {
        await deleteTaskComment(selectedTask.id, commentId);
        await fetchTaskDetail(selectedTask.id);
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  // ── UPLOAD ATTACHMENT ────────────────────────
  const handleUploadAttachment = async () => {
    if (!fileInput || !selectedTask) return;
    setIsLoading(true);
    try {
      await uploadTaskAttachment(selectedTask.id, fileInput);
      await fetchTaskDetail(selectedTask.id);
      setFileInput(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── DELETE ATTACHMENT ────────────────────────
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (window.confirm('Delete this attachment?')) {
      try {
        await deleteTaskAttachment(selectedTask.id, attachmentId);
        await fetchTaskDetail(selectedTask.id);
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  // ── STATUS UPDATE (MEMBER) ────────────────────────
  const handleMemberTaskAction = async (task: any) => {
    try {
      if (task.status === 'TODO') {
        await updateTaskStatus(task.id, 'IN_PROGRESS');
      } else if (task.status === 'IN_PROGRESS') {
        await updateTaskStatus(task.id, 'REVIEW');
      }
      await fetchTasks();
    } catch (e: any) {
      console.error('Error:', e);
    }
  };

  // ── STATUS UPDATE (PM/ADMIN) ────────────────────────
  const handleApproveTask = async (task: any) => {
    try {
      await updateTaskStatus(task.id, 'COMPLETED');
      await fetchTasks();
    } catch (e: any) {
      console.error('Error:', e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Delete this task?')) {
      try {
        await deleteTask(taskId);
        await fetchTasks();
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'LOW': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'TODO': return 'bg-slate-100 text-slate-700';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
      case 'REVIEW': return 'bg-purple-100 text-purple-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-500">Manage and track your work.</p>
        </div>
        <div className="flex gap-3">
          {canManage && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center">
              <Plus className="w-4 h-4 mr-2" /> New Task
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
      </div>

      {/* Department Filter */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Phòng ban</p>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setSelectedDepartment('')}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              selectedDepartment === '' 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
            Tất cả
          </button>
          {departments.map(dept => (
            <button
              key={dept.id}
              onClick={() => setSelectedDepartment(dept.id)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                selectedDepartment === dept.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
              {dept.name}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 pb-4">
          {COLUMNS.map(col => (
            <div key={col.status} className="flex-shrink-0 w-96 flex flex-col bg-slate-100 rounded-lg border border-slate-200"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col.status)}>
              
              {/* Column Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">{col.title}</h3>
                  <span className="bg-slate-300 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {tasks
                      .filter(t => isTaskVisible(t))
                      .filter(t => t.status === col.status)
                      .filter(t => {
                        if (!selectedDepartment || !t.departmentId) return !selectedDepartment;
                        const taskDeptId = typeof t.departmentId === 'object' ? ((t.departmentId as any).id || (t.departmentId as any)._id) : t.departmentId;
                        return taskDeptId === selectedDepartment;
                      })
                      .length
                    }
                  </span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {tasks
                  .filter(t => isTaskVisible(t))
                  .filter(t => t.status === col.status)
                  .filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
                  .filter(t => {
                    // ✅ Department filtering - normalize both IDs for comparison
                    if (!selectedDepartment || !t.departmentId) return !selectedDepartment;
                    const taskDeptId = typeof t.departmentId === 'object' ? ((t.departmentId as any).id || (t.departmentId as any)._id) : t.departmentId;
                    return taskDeptId === selectedDepartment;
                  })
                  .map(task => (
                    <div key={task.id} className="p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
                      draggable={canManage}
                      onDragStart={(e) => e.dataTransfer?.setData('taskId', task.id)}
                      onClick={() => handleOpenTaskDetail(task)}>
                      
                      {/* Task Content */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-slate-900 line-clamp-2 flex-1">{task.title}</h4>
                          {canManage && <Trash2 className="w-3 h-3 text-red-500 cursor-pointer hover:text-red-700" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} />}
                        </div>

                        {/* Priority & Deadline */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className={cn('px-2 py-0.5 rounded font-medium', getPriorityColor(task.priority))}>{task.priority}</span>
                          {task.deadline && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Clock className="w-3 h-3" /> {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Assignee */}
                        <div className="text-xs text-slate-600 font-medium">
                          {getAssigneeName(task.assigneeId)}
                        </div>

                        {/* Meta */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                          <span>Task #{task.id?.slice(-4) || ''}</span>
                          {currentTaskDetail?.comments?.length > 0 && <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {currentTaskDetail.comments.length}</span>}
                        </div>

                        {/* Action Buttons */}
                        {user?.role === 'MEMBER' && getAssigneeId(task.assigneeId) === user?.id && task.status !== 'COMPLETED' && (
                          <button onClick={(e) => { e.stopPropagation(); handleMemberTaskAction(task); }}
                            className={cn('w-full mt-2 py-1 rounded text-xs font-medium transition-colors',
                              task.status === 'TODO' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-green-100 text-green-700 hover:bg-green-200')}>
                            {task.status === 'TODO' ? 'Start' : 'Submit'}
                          </button>
                        )}

                        {(user?.role === 'ADMIN' || user?.role === 'PM') && task.status === 'REVIEW' && (
                          <button onClick={(e) => { e.stopPropagation(); handleApproveTask(task); }}
                            className="w-full mt-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-medium transition-colors">
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════ CREATE TASK MODAL */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input label="Task Title" placeholder="e.g. Design UI mockups" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea className="w-full min-h-[80px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Task details..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Project</label>
              <select className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.projectId} onChange={(e) => setFormData({...formData, projectId: e.target.value})} required>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Assign To</label>
              <select className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.assigneeId} onChange={(e) => setFormData({...formData, assigneeId: e.target.value})}>
                <option value="">Unassigned</option>
                {formData.projectId && Object.entries(getProjectMembersByDepartment(formData.projectId)).map(([deptName, members]) => (
                  <optgroup key={deptName} label={deptName}>
                    {members.map((member: any) => {
                      const memberId = member.id || member._id;
                      return <option key={memberId} value={memberId}>{member.name}</option>;
                    })}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Priority</label>
              <select className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value as TaskPriority})}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <Input label="Deadline" type="date" value={formData.deadline} onChange={(e) => setFormData({...formData, deadline: e.target.value})} />
          </div>

          {error && <p className="text-sm text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>Create Task</Button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════ TASK DETAIL MODAL */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={selectedTask?.title}>
        {currentTaskDetail && (
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {/* Task Info */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-xs text-slate-600 mb-1">Assignee</p>
                <p className="font-medium text-slate-900">{getAssigneeName(currentTaskDetail.assigneeId)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Priority</p>
                <p className={cn('inline-block px-2 py-1 rounded text-xs font-medium', getPriorityColor(currentTaskDetail.priority))}>{currentTaskDetail.priority}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Status</p>
                <p className={cn('inline-block px-2 py-1 rounded text-xs font-medium', getStatusColor(currentTaskDetail.status))}>{currentTaskDetail.status}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Deadline</p>
                <p className="text-sm text-slate-900">{currentTaskDetail.deadline ? new Date(currentTaskDetail.deadline).toLocaleDateString() : 'No deadline'}</p>
              </div>
            </div>

            {/* Description */}
            {currentTaskDetail.description && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Description</h4>
                <p className="text-sm text-slate-700">{currentTaskDetail.description}</p>
              </div>
            )}

            {/* Attachments */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Attachments ({currentTaskDetail.attachments?.length || 0})
              </h4>
              <div className="space-y-2 mb-3">
                {currentTaskDetail.attachments?.map((att: any) => (
                  <div key={att.id} className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 line-clamp-1">{att.fileName}</p>
                        <p className="text-xs text-slate-500">{(att.fileSize / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { const link = document.createElement('a'); link.href = att.fileUrl; link.download = att.fileName; link.click(); }} className="p-1 text-blue-500 hover:bg-blue-100 rounded">
                        <Download className="w-3 h-3" />
                      </button>
                      {(user?.id === att.uploadedBy?.id || canManage) && (
                        <button onClick={() => handleDeleteAttachment(att.id)} className="p-1 text-red-500 hover:bg-red-100 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload Attachment */}
              {(user?.id === currentTaskDetail.assigneeId?.id || canManage) && (
                <div className="flex gap-2 mb-4">
                  <input type="file" onChange={(e) => setFileInput(e.target.files?.[0] || null)} className="flex-1 text-sm" />
                  <Button size="sm" onClick={handleUploadAttachment} disabled={!fileInput || isLoading}>Upload</Button>
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Comments ({currentTaskDetail.comments?.length || 0})
              </h4>
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {currentTaskDetail.comments?.map((comment: any) => (
                  <div key={comment.id} className="p-2 bg-slate-50 rounded border border-slate-200">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium text-slate-900">{comment.authorId?.name || 'Unknown'}</p>
                      {(user?.id === comment.authorId?.id || canManage) && (
                        <button onClick={() => handleDeleteComment(comment.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">{comment.text}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(comment.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input type="text" placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                <button type="submit" disabled={!commentText.trim() || isLoading} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {error && <p className="text-sm text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-2 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)} className="flex-1">Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
