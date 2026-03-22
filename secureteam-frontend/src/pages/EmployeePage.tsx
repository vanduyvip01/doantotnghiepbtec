// src/pages/EmployeePage.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Key, Eye } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Card } from '../components/Card';
import { cn } from '../utils/cn';
import { Role } from '../types';
import { useNavigate } from 'react-router-dom';

export const EmployeePage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { employees, departments, fetchEmployees, fetchDepartments, addEmployee, updateEmployee, deleteEmployee } = useAppStore();
  
  // Redirect MEMBER to profile page
  useEffect(() => {
    if (user?.role === 'MEMBER') {
      navigate('/profile');
    }
  }, [user, navigate]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: 'SecurePass@123', 
    department: '', 
    role: 'MEMBER' as Role,
    status: 'ACTIVE'
  });

  // 2FA display modal
  const [show2FAKeyModal, setShow2FAKeyModal] = useState(false);
  const [selected2FAKey, setSelected2FAKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Profile view modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  useEffect(() => { 
    fetchEmployees(); 
    fetchDepartments(); 
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isPM = user?.role === 'PM';

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── ADMIN ONLY FUNCTIONS ────────────────────────────────
  const openAddModal = () => {
    if (!isAdmin) return;
    setEditingId(null);
    setForm({ name: '', email: '', password: 'SecurePass@123', department: '', role: 'MEMBER', status: 'ACTIVE' });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (employee: any) => {
    if (!isAdmin) return;
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      email: employee.email,
      password: 'SecurePass@123',
      department: typeof employee.department === 'object' ? employee.department?.name || '' : employee.department || '',
      role: employee.role,
      status: employee.status,
    });
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm({ name: '', email: '', password: 'SecurePass@123', department: '', role: 'MEMBER', status: 'ACTIVE' });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    setError('');
    setIsLoading(true);
    try {
      if (!form.name || !form.email || !form.department) {
        setError('Please fill in all required fields');
        return;
      }
      
      if (editingId) {
        const { password, ...updateData } = form;
        await updateEmployee(editingId, updateData);
        await fetchEmployees();
        closeModal();
      } else {
        await addEmployee(form);
        await fetchEmployees();
        closeModal();
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save employee');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (!isAdmin || !window.confirm('Delete this employee?')) return;
    try {
      await deleteEmployee(employeeId);
      await fetchEmployees();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const show2FAKey = (employee: any) => {
    setSelected2FAKey(employee.twoFactorSecret);
    setShow2FAKeyModal(true);
    setCopiedKey(false);
  };

  const openProfileModal = (employee: any) => {
    setSelectedEmployee(employee);
    setShowProfileModal(true);
  };

  const copyToClipboard = () => {
    if (selected2FAKey) {
      navigator.clipboard.writeText(selected2FAKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  if (user?.role === 'MEMBER') return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-500">{isAdmin ? 'Manage your team members and assign roles.' : 'View team members in your projects.'}</p>
        </div>
        {isAdmin && (
          <Button onClick={openAddModal} className="flex items-center">
            <Plus className="w-4 h-4 mr-2" /> New Employee
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Role</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Department</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
              {isAdmin && <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((employee) => (
              <tr key={employee.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{employee.name}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{employee.email}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={cn("px-2 py-1 rounded text-xs font-semibold",
                    employee.role === 'ADMIN' ? "bg-red-100 text-red-700" :
                    employee.role === 'PM' ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  )}>
                    {employee.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {typeof employee.department === 'object' 
                    ? (employee.department as any)?.name || '-' 
                    : employee.department || '-'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={cn("px-2 py-1 rounded text-xs font-semibold",
                    employee.status === 'ACTIVE' ? "bg-green-100 text-green-700" : 
                    employee.status === 'INACTIVE' ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {employee.status}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-sm space-x-2 flex items-center">
                    <button 
                      onClick={() => openProfileModal(employee)}
                      className="p-1 hover:bg-indigo-100 rounded text-indigo-600"
                      title="View Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => show2FAKey(employee)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-600"
                      title="View 2FA Key"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => openEditModal(employee)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(employee.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═════════════════════════════════════════════ EDIT/CREATE MODAL */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Edit Employee' : 'Create Employee'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Full Name" 
            required 
            value={form.name}
            onChange={(e) => setForm({...form, name: e.target.value})}
          />
          
          <Input 
            label="Email" 
            type="email"
            required 
            disabled={!!editingId}
            value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
          />

          {!editingId && (
            <Input 
              label="Password" 
              type="password"
              required 
              placeholder="e.g. SecurePass@123"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
            />
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Department *</label>
            <select 
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={form.department}
              onChange={(e) => setForm({...form, department: e.target.value})}
              required
            >
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Role *</label>
              <select 
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.role}
                onChange={(e) => setForm({...form, role: e.target.value as Role})}
                required
              >
                <option value="MEMBER">Member</option>
                <option value="PM">Project Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Status *</label>
              <select 
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.status}
                onChange={(e) => setForm({...form, status: e.target.value})}
                required
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>{editingId ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* ═════════════════════════════════════════════ 2FA KEY MODAL */}
      <Modal isOpen={show2FAKeyModal} onClose={() => setShow2FAKeyModal(false)} title="2FA Secret Key">
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600 mb-2">Manual Entry Key (Base32)</p>
            <p className="font-mono text-sm font-bold text-slate-900 break-all">{selected2FAKey}</p>
          </div>
          
          <Button 
            onClick={copyToClipboard}
            variant="outline"
            className="w-full"
          >
            {copiedKey ? '✓ Copied!' : 'Copy Key'}
          </Button>

          <p className="text-xs text-slate-500">Enter this key into Google Authenticator or scan QR code</p>
          
          <Button variant="outline" onClick={() => setShow2FAKeyModal(false)} className="w-full">Close</Button>
        </div>
      </Modal>

      {/* ═════════════════════════════════════════════ PROFILE MODAL */}
      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Employee Profile">
        {selectedEmployee && (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <img 
                src={selectedEmployee.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmployee.email}`}
                alt={selectedEmployee.name}
                className="w-20 h-20 rounded-full border-4 border-indigo-200 mb-4"
                onError={(e) => {
                  (e.target as any).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmployee.email}`;
                }}
              />
              <h2 className="text-2xl font-bold text-slate-900">{selectedEmployee.name}</h2>
              <p className="text-slate-500">{selectedEmployee.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Role</p>
                <p className="text-lg font-bold text-slate-900">{selectedEmployee.role}</p>
              </Card>
              
              <Card className="border-none shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Status</p>
                <span className={cn("inline-block px-2 py-1 rounded text-xs font-semibold",
                  selectedEmployee.status === 'ACTIVE' ? "bg-green-100 text-green-700" :
                  selectedEmployee.status === 'INACTIVE' ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                )}>
                  {selectedEmployee.status}
                </span>
              </Card>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Department</p>
                <p className="text-sm text-slate-900">
                  {typeof selectedEmployee.department === 'object' 
                    ? selectedEmployee.department?.name || 'Not assigned' 
                    : selectedEmployee.department || 'Not assigned'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Email</p>
                <p className="text-sm text-slate-600">{selectedEmployee.email}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">2FA Status</p>
                <span className={cn("inline-block px-2 py-1 rounded text-xs font-semibold",
                  selectedEmployee.twoFactorEnabled ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                )}>
                  {selectedEmployee.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Last Login</p>
                <p className="text-sm text-slate-600">
                  {selectedEmployee.lastLogin 
                    ? new Date(selectedEmployee.lastLogin).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      }) 
                    : 'Never'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => {
                  openEditModal(selectedEmployee);
                  setShowProfileModal(false);
                }} 
                className="flex-1"
              >
                <Edit2 className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button variant="outline" onClick={() => setShowProfileModal(false)} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
