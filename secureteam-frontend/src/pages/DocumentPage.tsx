import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Search, Filter, Upload, File, Image as ImageIcon, FileCode, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { cn } from '../utils/cn';
import { api } from '../api/client';

export const DocumentPage = () => {
  const { user } = useAuthStore();
  const { documents, projects, departments, uploadDocument, deleteDocument, fetchDocuments, fetchDepartments } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ file: null as File | null, projectId: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('');

  useEffect(() => { 
    fetchDocuments();
    fetchDepartments();
  }, []);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="w-5 h-5 text-rose-500" />;
      case 'IMAGE': return <ImageIcon className="w-5 h-5 text-indigo-500" />;
      case 'CODE': return <FileCode className="w-5 h-5 text-emerald-500" />;
      default: return <File className="w-5 h-5 text-slate-500" />;
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      // Log access to honeytoken trap
      const response = await api.post(`/documents/${doc.id}/access`, { actionType: 'DOWNLOAD' });
      
      if (response.honeytoken) {
        alert('⚠️ CẢNH BÁO: Bạn đã truy cập vào một tài liệu bẫy nội gián!\n\nHành động này đã được ghi nhận và báo cáo cho ban quản trị.');
      }
      
      // Proceed download
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = doc.name;
      link.click();
    } catch (e: any) {
      console.error('Error logging access:', e);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file || !form.projectId) {
      setError('Please select file and project');
      return;
    }
    
    // ✅ Check permission: ADMIN can upload to any project, PM/MEMBER only to their department
    if (user?.role !== 'ADMIN') {
      const selectedProject = projects.find(p => p.id === form.projectId);
      if (!selectedProject) {
        setError('Project not found');
        return;
      }
      
      const projectDeptId = typeof selectedProject.departmentId === 'object' 
        ? selectedProject.departmentId?.id || selectedProject.departmentId?._id 
        : selectedProject.departmentId;
      const userDeptId = typeof user?.department === 'object' 
        ? user.department?.id || user.department?._id 
        : user?.department;
      
      if (projectDeptId !== userDeptId) {
        setError('Chỉ được upload tài liệu cho dự án của phòng ban mình');
        return;
      }
    }
    
    setError('');
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', form.file);
      formData.append('projectId', form.projectId);
      
      await uploadDocument(formData);
      await fetchDocuments();
      setIsModalOpen(false);
      setForm({ file: null, projectId: '' });
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDocument(id);
      await fetchDocuments();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ✅ Get projects available for current user (based on role & department)
  const availableProjects = user?.role === 'ADMIN' 
    ? projects 
    : projects.filter(p => {
        const projectDeptId = typeof p.departmentId === 'object' 
          ? (p.departmentId?.id || p.departmentId?._id) 
          : p.departmentId;
        const userDeptId = typeof user?.department === 'object' 
          ? (user.department?.id || user.department?._id) 
          : user?.department;
        return projectDeptId === userDeptId;
      });

  // ✅ Filter documents with role-based access control
  const filtered = documents.filter(d => {
    // Search filter
    if (!d.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    // Project filter
    if (filterProject && d.projectId !== filterProject) return false;
    
    // Note: Backend handles department & task-based visibility
    // Frontend just displays what the backend returns
    return true;
  });

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-500">Central repository for all project assets.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center">
          <Upload className="w-4 h-4 mr-2" /> Upload Document
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center space-x-2">
            <select 
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
            >
              <option value="">All Projects</option>
              {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 font-semibold text-sm text-slate-900">File Name</th>
                <th className="px-6 py-4 font-semibold text-sm text-slate-900">Project</th>
                <th className="px-6 py-4 font-semibold text-sm text-slate-900">Uploaded By</th>
                <th className="px-6 py-4 font-semibold text-sm text-slate-900">Date</th>
                <th className="px-6 py-4 font-semibold text-sm text-slate-900">Size</th>
                <th className="px-6 py-4 font-semibold text-sm text-slate-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc: any) => (
                <tr key={doc.id} className={cn('hover:bg-slate-50/50 transition-colors', doc.isHoneytoken ? 'bg-red-50/30' : '')}>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {doc.isHoneytoken ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" title="Honeytoken - Bẫy nội gián" />
                      ) : (
                        getFileIcon(doc.type)
                      )}
                      <div>
                        <span className="text-sm font-medium text-slate-900">{doc.name}</span>
                        {doc.isHoneytoken && <div className="text-xs text-red-600 font-semibold">🔴 TRAP</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-600">
                      {typeof doc.projectId === 'object' ? doc.projectId?.name : projects.find(p => p.id === doc.projectId)?.name || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {typeof doc.uploadedBy === 'object' ? doc.uploadedBy?.name : doc.uploadedBy}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{doc.uploadDate || new Date(doc.createdAt || '').toLocaleDateString('vi-VN')}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{(Number(doc.size) / 1024 / 1024).toFixed(2)} MB</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => handleDownload(doc)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                      {(user?.role === 'ADMIN' || user?.role === 'PM') && (
                        <button onClick={() => handleDelete(doc.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Document">
      <form onSubmit={handleUpload} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Project</label>
          <select 
            className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={form.projectId}
            onChange={e => setForm({...form, projectId: e.target.value})}
            required
          >
            <option value="">Select Project</option>
            {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">File</label>
          <input 
            type="file"
            className="w-full"
            onChange={e => setForm({...form, file: e.target.files?.[0] || null})}
            required
          />
        </div>
        {error && <p className="text-sm text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="pt-4 flex justify-end space-x-3">
          <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Upload</Button>
        </div>
      </form>
    </Modal>
    </>
  );
};
