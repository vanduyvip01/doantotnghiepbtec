// src/pages/AttendancePage.tsx  ← ROLE-BASED ATTENDANCE MANAGEMENT
import React, { useEffect, useState } from 'react';
import { Clock, Calendar, CheckCircle2, XCircle, Download, Edit2, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { cn } from '../utils/cn';

export const AttendancePage = () => {
  const { user } = useAuthStore();
  const { attendance, employees, fetchAttendance, checkIn, checkOut, updateAttendance, exportAttendance } = useAppStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showExport, setShowExport] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>({ date: '', checkIn: '', checkOut: '', status: 'PRESENT' });
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [adminSelectedDate, setAdminSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { fetchAttendance(); }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isPM = user?.role === 'PM';
  const isMember = user?.role === 'MEMBER';

  const today = new Date().toISOString().split('T')[0];
  const todayAtt = attendance.filter(a => a.date === today);
  const presentCount = todayAtt.filter(a => ['PRESENT', 'LATE'].includes(a.status)).length;
  const lateCount = todayAtt.filter(a => a.status === 'LATE').length;
  const absentCount = employees.length - presentCount;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PRESENT: 'bg-emerald-100 text-emerald-800',
      LATE: 'bg-amber-100 text-amber-800',
      ABSENT: 'bg-rose-100 text-rose-800',
      HALF_DAY: 'bg-slate-100 text-slate-800',
    };
    return <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', map[status] || map.ABSENT)}>{status}</span>;
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const data = await exportAttendance(exportMonth);
      // Convert to CSV format
      const headers = ['Employee', 'Date', 'Check-in', 'Check-out', 'Status', 'Work Hours'];
      const rows = data.map((att: any) => {
        const emp = employees.find(e => e.id === att.userId);
        return [
          emp?.name || 'Unknown',
          att.date,
          att.checkIn || '--:--',
          att.checkOut || '--:--',
          att.status,
          att.workHours || '0',
        ];
      });

      const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${exportMonth}.csv`;
      a.click();
      setShowExport(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleEditStart = (att: any) => {
    setEditingId(att.id);
    setEditForm({ date: att.date, checkIn: att.checkIn, checkOut: att.checkOut, status: att.status });
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    if (editingId) {
      await updateAttendance(editingId, editForm);
      setShowEdit(false);
      setEditingId(null);
      fetchAttendance();
    }
  };

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    setMessage('');
    try {
      await checkIn();
      setMessage('✅ Checked in successfully!');
      await fetchAttendance();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`❌ ${error.message || 'Check-in failed'}`);
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckOutLoading(true);
    setMessage('');
    try {
      await checkOut();
      setMessage('✅ Checked out successfully!');
      await fetchAttendance();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`❌ ${error.message || 'Check-out failed'}`);
    } finally {
      setCheckOutLoading(false);
    }
  };

  const filteredAttendance = attendance.filter(a => a.date.startsWith(filterMonth));
  const memberAttendance = filteredAttendance.filter(a => a.userId === user?.id);
  
  // Get PM's own attendance + department attendance
  const pmAttendance = filteredAttendance.filter(a => a.userId === user?.id);
  
  // Get PM's department attendance (filtered by department)
  const getDepartmentCompare = (dept: any) => {
    if (typeof dept === 'object') {
      return dept?.name || dept?.id || dept;
    }
    return dept;
  };
  
  const pmDeptValue = getDepartmentCompare(user?.department);
  const pmDepartmentEmployees = user?.department && pmDeptValue
    ? employees.filter(e => {
        const eDeptValue = getDepartmentCompare(e.department);
        return eDeptValue === pmDeptValue;
      })
    : [];
  
  // PM sees: own attendance + team members' attendance
  const pmDepartmentAttendance = filteredAttendance.filter(a => 
    a.userId === user?.id || pmDepartmentEmployees.some(emp => emp.id === a.userId)
  );

  // ===== ADMIN: Build daily attendance with all employees =====
  const adminDailyAttendance = employees.map(emp => {
    const att = attendance.find(a => a.date === adminSelectedDate && a.userId === emp.id);
    if (att) {
      return att;  // Already checked in/out
    }
    // No attendance record = auto-fill ABSENT
    return {
      id: `temp-${emp.id}-${adminSelectedDate}`,
      userId: emp.id,
      date: adminSelectedDate,
      checkIn: null,
      checkOut: null,
      status: 'ABSENT',
    };
  });

  // ===== ADMIN VIEW =====
  if (isAdmin) {
    // Calculate stats for selected date
    const adminTodayAtt = adminDailyAttendance.filter(a => ['PRESENT', 'LATE'].includes(a.status)).length;
    const adminTodayLate = adminDailyAttendance.filter(a => a.status === 'LATE').length;
    const adminTodayAbsent = adminDailyAttendance.filter(a => a.status === 'ABSENT').length;

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Attendance Management</h1>
            <p className="text-slate-500 mt-1">View all employees, manage records, and export reports.</p>
          </div>
          <Button onClick={() => setShowExport(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Download className="w-4 h-4 mr-2" /> Export Report
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Staff', value: employees.length, color: 'text-indigo-600' },
            { label: 'Present', value: adminTodayAtt, color: 'text-emerald-600' },
            { label: 'Late', value: adminTodayLate, color: 'text-amber-600' },
            { label: 'Absent', value: adminTodayAbsent, color: 'text-rose-600' },
          ].map(s => (
            <Card key={s.label} className="border-none shadow-sm">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
              <p className={cn('text-4xl font-black mt-2', s.color)}>{s.value}</p>
            </Card>
          ))}
        </div>

        <div className="bg-white/60 rounded-2xl border shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b flex items-center justify-between bg-white/30">
            <h3 className="font-bold text-slate-900">Daily Attendance Report</h3>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                value={adminSelectedDate} 
                onChange={e => setAdminSelectedDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white" 
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  {['Employee', 'Check-in', 'Check-out', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {adminDailyAttendance.map(att => {
                  const emp = employees.find(e => e.id === att.userId);
                  return (
                    <tr key={att.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {emp?.avatar ? <img src={emp.avatar} className="w-full h-full rounded-full object-cover" /> : emp?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{emp?.name || 'Unknown'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-600"><Clock className="inline w-3.5 h-3.5 mr-1 text-slate-400" />{att.checkIn || '--:--'}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-600"><Clock className="inline w-3.5 h-3.5 mr-1 text-slate-400" />{att.checkOut || '--:--'}</td>
                      <td className="px-6 py-4">{statusBadge(att.status)}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleEditStart(att)} className="text-indigo-600 hover:text-indigo-700 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===== PM VIEW =====
  if (isPM) {
    const pmTodayAtt = attendance.find(a => a.date === today && a.userId === user?.id);
    
    // Debug logging
    useEffect(() => {
      console.log('🔍 PM DEBUG:', {
        today,
        userID: user?.id,
        totalAttendance: attendance.length,
        pmTodayAtt,
        pmDepartmentAttendance: pmDepartmentAttendance.length + ' records',
        allAttendanceUserIds: attendance.map(a => a.userId).slice(0, 5)
      });
    }, [attendance]);

    return (
      <div className="space-y-8">
        {message && (
          <div className={cn('p-4 rounded-lg text-sm font-medium', 
            message.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          )}>
            {message}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Department Attendance</h1>
            <p className="text-slate-500 mt-1">Manage your attendance and monitor your department's presence.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleCheckOut} 
              isLoading={checkOutLoading}
              disabled={checkInLoading}
              className="text-rose-600 border-rose-200 hover:bg-rose-50">
              <XCircle className="w-4 h-4 mr-2" /> Check Out
            </Button>
            <Button 
              onClick={handleCheckIn} 
              isLoading={checkInLoading}
              disabled={checkOutLoading}
              className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Check In
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Your Status Today', value: pmTodayAtt ? pmTodayAtt.status : 'Not checked in', color: 'text-indigo-600' },
            { label: 'Check-in', value: pmTodayAtt ? (pmTodayAtt.checkIn || '--:--') : '--:--', color: 'text-emerald-600' },
            { label: 'Check-out', value: pmTodayAtt ? (pmTodayAtt.checkOut || '--:--') : '--:--', color: 'text-slate-600' },
          ].map(s => (
            <Card key={s.label} className="border-none shadow-sm">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
              <p className={cn('text-2xl font-black mt-2', s.color)}>{s.value}</p>
            </Card>
          ))}
        </div>

        <div className="bg-white/60 rounded-2xl border shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b flex items-center justify-between bg-white/30">
            <h3 className="font-bold text-slate-900">
              {typeof user?.department === 'object' ? (user?.department as any)?.name : user?.department} - Attendance Records
            </h3>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  {['Employee', 'Date', 'Check-in', 'Check-out', 'Status'].map(h => (
                    <th key={h} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pmDepartmentAttendance.map(att => {
                  const emp = employees.find(e => e.id === att.userId);
                  return (
                    <tr key={att.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {emp?.avatar ? <img src={emp.avatar} className="w-full h-full rounded-full object-cover" /> : emp?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{emp?.name || 'Unknown'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{att.date}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-600"><Clock className="inline w-3.5 h-3.5 mr-1 text-slate-400" />{att.checkIn || '--:--'}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-600"><Clock className="inline w-3.5 h-3.5 mr-1 text-slate-400" />{att.checkOut || '--:--'}</td>
                      <td className="px-6 py-4">{statusBadge(att.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===== MEMBER VIEW =====
  return (
    <div className="space-y-8">
      {message && (
        <div className={cn('p-4 rounded-lg text-sm font-medium', 
          message.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        )}>
          {message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Attendance</h1>
          <p className="text-slate-500 mt-1">Check in/out and view your attendance history.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleCheckOut} 
            isLoading={checkOutLoading}
            disabled={checkInLoading}
            className="text-rose-600 border-rose-200 hover:bg-rose-50">
            <XCircle className="w-4 h-4 mr-2" /> Check Out
          </Button>
          <Button 
            onClick={handleCheckIn} 
            isLoading={checkInLoading}
            disabled={checkOutLoading}
            className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Check In
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Status Today', value: todayAtt.length > 0 ? todayAtt[0].status : 'Not checked in', color: 'text-indigo-600' },
          { label: 'Check-in', value: todayAtt.length > 0 ? (todayAtt[0].checkIn || '--:--') : '--:--', color: 'text-emerald-600' },
          { label: 'Check-out', value: todayAtt.length > 0 ? (todayAtt[0].checkOut || '--:--') : '--:--', color: 'text-slate-600' },
        ].map(s => (
          <Card key={s.label} className="border-none shadow-sm">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className={cn('text-2xl font-black mt-2', s.color)}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="bg-white/60 rounded-2xl border shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center justify-between bg-white/30">
          <h3 className="font-bold text-slate-900">Attendance History</h3>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                {['Date', 'Check-in', 'Check-out', 'Status'].map(h => (
                  <th key={h} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {memberAttendance.map(att => (
                <tr key={att.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">{att.date}</td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-600"><Clock className="inline w-3.5 h-3.5 mr-1 text-slate-400" />{att.checkIn || '--:--'}</td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-600"><Clock className="inline w-3.5 h-3.5 mr-1 text-slate-400" />{att.checkOut || '--:--'}</td>
                  <td className="px-6 py-4">{statusBadge(att.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showExport} onClose={() => setShowExport(false)} title="Export Attendance Report">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Select month to export:</p>
          <input type="month" value={exportMonth} onChange={e => setExportMonth(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <div className="flex gap-3">
            <Button onClick={handleExport} loading={exportLoading} className="flex-1">Download</Button>
            <Button onClick={() => setShowExport(false)} variant="outline" className="flex-1">Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Attendance Record">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Date</label>
            <Input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Check-in</label>
              <Input type="time" value={editForm.checkIn} onChange={e => setEditForm({ ...editForm, checkIn: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Check-out</label>
              <Input type="time" value={editForm.checkOut} onChange={e => setEditForm({ ...editForm, checkOut: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Status</label>
            <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20">
              {['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleEditSave} className="flex-1">Save</Button>
            <Button onClick={() => setShowEdit(false)} variant="outline" className="flex-1">Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
