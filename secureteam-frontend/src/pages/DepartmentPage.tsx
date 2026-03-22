import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, Users } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';

export const DepartmentPage = () => {
  const { departments, employees, addDepartment, deleteDepartment, fetchDepartments, fetchEmployees } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('📋 DepartmentPage mounting, fetching data...');
    fetchDepartments();
    fetchEmployees();
  }, []);

  // Log departments and employees whenever they change
  useEffect(() => {
    console.log('🏢 Departments loaded:', departments);
    departments.forEach(d => console.log(`  - ${d.name} (id: ${d.id})`));
  }, [departments]);

  useEffect(() => {
    console.log('👥 Employees loaded:', employees);
    employees.forEach(e => {
      const dept = typeof e.department === 'object' ? e.department?.name : e.department;
      console.log(`  - ${e.name} -> dept: ${dept}`);
    });
  }, [employees]);

  // Log when modal state changes
  useEffect(() => {
    console.log('🪟 isMembersModalOpen changed:', isMembersModalOpen);
    if (isMembersModalOpen) {
      console.log('📋 selectedDept:', selectedDept);
    }
  }, [isMembersModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await addDepartment(form);
      await fetchDepartments();
      setIsModalOpen(false);
      setForm({ name: '', description: '' });
    } catch (e: any) {
      setError(e.message || 'Failed to create department');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteDepartment(id);
      await fetchDepartments();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const openMembersModal = (dept: any) => {
    console.log('👥 CLICKED Department:', dept);
    console.log('  - dept.name:', dept.name);
    console.log('  - dept.id:', dept.id);
    console.log('📊 Total employees in store:', employees.length);
    console.log('🔍 Trying to find employees with dept.name:', dept.name);
    employees.forEach(e => {
      const empDept = typeof e.department === 'object' ? e.department?.name : e.department;
      const match = empDept === dept.name;
      console.log(`  ${match ? '✅' : '❌'} ${e.name}: "${empDept}" === "${dept.name}"?`);
    });
    console.log('🔄 Setting selectedDept and opening modal...');
    setSelectedDept(dept);
    setIsMembersModalOpen(true);
    console.log('✅ Modal state updated');
  };

  // Get members count for any department
  const getMembersCount = (dept: any): number => {
    const members = employees.filter(emp => {
      const deptName = typeof emp.department === 'object' 
        ? emp.department?.name 
        : emp.department;
      const match = deptName === dept.name;
      return match;
    });
    return members.length;
  };

  // Get employees in selected department
  const deptMembers = selectedDept 
    ? employees.filter(emp => {
        // Try matching by department name
        const deptName = typeof emp.department === 'object' 
          ? emp.department?.name 
          : emp.department;
        
        const nameMatch = deptName === selectedDept.name;
        
        // Also try matching by ID
        const deptId = typeof emp.department === 'object' 
          ? emp.department?._id || emp.department?.id
          : null;
        const idMatch = deptId && deptId === selectedDept.id;
        
        const match = nameMatch || idMatch;
        
        return match;
      })
    : [];
  
  console.log(`🎯 DeptMembers for ${selectedDept?.name}: ${deptMembers.length} found`);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
          <p className="text-slate-500">Organize your organization structure.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Create Department
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <Card 
            key={dept.id} 
            className="group hover:shadow-md transition-shadow cursor-pointer hover:border-indigo-200"
            onClick={() => openMembersModal(dept)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors" onClick={() => handleDelete(dept.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{dept.name}</h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2 min-h-[40px]">{dept.description}</p>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-slate-600">
              <Users className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">{getMembersCount(dept)} Members</span>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Department">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Department Name" 
            placeholder="e.g. Engineering" 
            required 
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea 
              className="w-full min-h-[100px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Describe the department's responsibilities..."
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
            />
          </div>
          {error && <p className="text-sm text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="pt-4 flex justify-end space-x-3">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>Create Department</Button>
          </div>
        </form>
      </Modal>

      {/* Department Members Modal */}
      <Modal isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)} title={`${selectedDept?.name} - Team Members`}>
        <div className="space-y-4">
          {deptMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No members in this department yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {deptMembers.map((emp) => (
                <div key={emp._id || emp.id || emp.email} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{emp.name}</h4>
                      <p className="text-sm text-slate-500">{emp.email}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {emp.role}
                        </span>
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          {emp.status}
                        </span>
                      </div>
                    </div>
                    {emp.avatar && (
                      <img 
                        src={emp.avatar} 
                        alt={emp.name}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded text-sm text-indigo-700">
            📊 Total: {deptMembers.length} member{deptMembers.length !== 1 ? 's' : ''}
          </div>
        </div>
      </Modal>
    </div>
  );
};
