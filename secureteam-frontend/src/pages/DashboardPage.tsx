// ============================================================
//  src/pages/DashboardPage.tsx  ← THAY THẾ FILE CŨ
// ============================================================
import React, { useEffect } from 'react';
import { Users, Briefcase, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/Card';
import { cn } from '../utils/cn';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const { projects, tasks, employees, attendance, dashboardStats,
          fetchProjects, fetchTasks, fetchEmployees, fetchAttendance, fetchDashboard } = useAppStore();

  useEffect(() => {
    fetchDashboard();
    fetchProjects();
    fetchTasks();
    fetchEmployees();
    fetchAttendance({ date: new Date().toISOString().split('T')[0] });
  }, []);

  const stats = [
    { label: 'Total Employees',   value: dashboardStats?.totalEmployees  ?? employees.length,                       icon: Users,        color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
    { label: 'Active Projects',   value: dashboardStats?.activeProjects  ?? projects.filter(p => p.status === 'ACTIVE').length,      icon: Briefcase,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Tasks In Progress', value: dashboardStats?.tasksInProgress ?? tasks.filter(t => t.status === 'IN_PROGRESS').length,    icon: TrendingUp,   color: 'text-amber-600',   bg: 'bg-amber-50'   },
    { label: 'Completed Tasks',   value: dashboardStats?.completedTasks  ?? tasks.filter(t => t.status === 'COMPLETED').length,      icon: CheckCircle2, color: 'text-purple-600',  bg: 'bg-purple-50'  },
  ];

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === today);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name}</h1>
        <p className="text-slate-500">Here's what's happening in your organization today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={cn('p-3 rounded-xl', stat.bg)}>
                <stat.icon className={cn('w-6 h-6', stat.color)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects */}
        <Card title="Active Projects" className="lg:col-span-2">
          <div className="space-y-4">
            {projects.filter(p => p.status === 'ACTIVE').slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                  <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden w-48">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
                <span className="text-sm font-bold text-indigo-600 ml-4">{p.progress}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Deadlines */}
        <Card title="Upcoming Deadlines">
          <div className="space-y-4">
            {tasks.filter(t => t.status !== 'COMPLETED').slice(0, 4).map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {t.deadline ? new Date(t.deadline).toLocaleDateString('en-US') : '—'}
                  </p>
                </div>
                <div className={cn('px-2 py-1 rounded text-[10px] font-bold uppercase',
                  t.priority === 'URGENT' ? 'bg-rose-100 text-rose-600' :
                  t.priority === 'HIGH'   ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                )}>
                  {t.priority}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Today Attendance */}
      <Card title="Attendance Today" description="Employee check-in status for today" className="border-none shadow-sm">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Present', count: todayAttendance.filter(a => ['PRESENT','LATE'].includes(a.status)).length, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
            { label: 'Late',    count: todayAttendance.filter(a => a.status === 'LATE').length,                   color: 'text-amber-700 bg-amber-50 border-amber-100'   },
            { label: 'Absent',  count: employees.length - todayAttendance.length,                                 color: 'text-rose-700 bg-rose-50 border-rose-100'     },
          ].map(s => (
            <div key={s.label} className={cn('p-4 rounded-xl border', s.color)}>
              <p className="text-xs font-bold uppercase tracking-widest">{s.label}</p>
              <p className="text-2xl font-black mt-1">{s.count}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Employee</th>
                <th className="pb-3 text-xs font-bold text-slate-400 uppercase text-center">Check-in</th>
                <th className="pb-3 text-xs font-bold text-slate-400 uppercase text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employees.slice(0, 5).map(emp => {
                const att = todayAttendance.find(a => a.userId === emp.id);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {emp.avatar ? <img src={emp.avatar} className="w-full h-full rounded-full object-cover" /> : emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{emp.name}</p>
                          <p className="text-[10px] text-slate-400">{typeof emp.department === 'object' ? (emp.department as any)?.name : emp.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center font-mono text-sm text-slate-500">{att?.checkIn || '--:--'}</td>
                    <td className="py-3 text-right">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                        att?.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' :
                        att?.status === 'LATE'    ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      )}>{att?.status ?? 'Absent'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
