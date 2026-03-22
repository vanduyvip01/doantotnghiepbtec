// src/pages/SecurityLogPage.tsx  ← THAY THẾ FILE CŨ
import React, { useEffect } from 'react';
import { Shield, Smartphone, Globe, AlertTriangle, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/Card';
import { cn } from '../utils/cn';

export const SecurityLogPage = () => {
  const { securityLogs, fetchSecurityLogs } = useAppStore();
  useEffect(() => { fetchSecurityLogs(); }, []);

  const success = securityLogs.filter(l => l.status === 'SUCCESS').length;
  const failed  = securityLogs.filter(l => l.status === 'FAILED').length;
  const honeytokenAlerts = securityLogs.filter(l => l.action?.includes('HONEYTOKEN')).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Security Logs</h1><p className="text-slate-500">Monitor system access and security events.</p></div>
        <span className={cn('flex items-center text-xs font-medium px-2 py-1 rounded-full',
          honeytokenAlerts > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50')}>
          {honeytokenAlerts > 0 ? (
            <><AlertTriangle className="w-3 h-3 mr-1" /> {honeytokenAlerts} Trap{honeytokenAlerts > 1 ? 's' : ''} Triggered</>
          ) : (
            <><CheckCircle2 className="w-3 h-3 mr-1" /> System Secure</>
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Successful Logins',   value: success, icon: Shield,        color: 'text-indigo-600 bg-indigo-50', border: 'border-l-indigo-500' },
          { label: 'Suspicious Activity', value: failed,  icon: AlertTriangle, color: 'text-amber-600 bg-amber-50',   border: 'border-l-amber-500'  },
          { label: 'Failed Attempts',     value: failed,  icon: XCircle,       color: 'text-rose-600 bg-rose-50',     border: 'border-l-rose-500'   },
          { label: 'Honeytoken Traps',    value: honeytokenAlerts, icon: Zap, color: 'text-red-600 bg-red-50', border: 'border-l-red-500' },
        ].map(s => (
          <Card key={s.label} className={cn('border-l-4', s.border)}>
            <div className="flex items-center space-x-3">
              <div className={cn('p-2 rounded-lg', s.color)}><s.icon className="w-5 h-5" /></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase">{s.label}</p><p className="text-xl font-bold text-slate-900">{s.value}</p></div>
            </div>
          </Card>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['User','Action','Details','Timestamp','IP Address','Device','Status'].map(h => (
                  <th key={h} className="px-6 py-4 font-semibold text-sm text-slate-900">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {securityLogs.map(log => {
                const isHoneytoken = log.action?.includes('HONEYTOKEN');
                return (
                  <tr key={log.id} className={cn('hover:bg-slate-50/50 transition-colors',
                    isHoneytoken ? 'bg-red-50/50 border-l-4 border-l-red-500' : '')}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs',
                          isHoneytoken ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600')}>
                          {log.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{log.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={cn('font-semibold', isHoneytoken ? 'text-red-600' : 'text-slate-600')}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {isHoneytoken && (log as any).meta?.documentName ? (
                        <div className="text-xs">
                          <div className="font-semibold text-red-700">🔴 {(log as any).meta.documentName}</div>
                          <div className="text-slate-500">Severity: {(log as any).meta.severity}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : (log as any).createdAt ? new Date((log as any).createdAt).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600"><Globe className="inline w-3 h-3 mr-1.5 text-slate-400" />{log.ipAddress}</td>
                    <td className="px-6 py-4 text-sm text-slate-600"><Smartphone className="inline w-3 h-3 mr-1.5 text-slate-400" />{log.device}</td>
                    <td className="px-6 py-4">
                      <span className={cn('px-2 py-1 rounded-full text-[10px] font-bold uppercase',
                        log.status === 'SUCCESS' ? (isHoneytoken ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700') : 'bg-rose-100 text-rose-700'
                      )}>{log.status}</span>
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
};
