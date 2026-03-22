import React, { useState } from 'react';
import { User, Mail, Shield, Key, Smartphone, Globe, Camera, Save, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { api } from '../api/client';
import { cn } from '../utils/cn';

export const ProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const { departments } = useAppStore();
  
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setSuccessMessage('');
    setProfileLoading(true);
    
    try {
      const response = await api.put<any>('/users/' + user?.id, {
        name: profileForm.name,
      });
      
      if (response) {
        setUser(response);
        setSuccessMessage('✅ Profile updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (e: any) {
      setProfileError(e.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setSuccessMessage('');
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    setPasswordLoading(true);
    
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      
      setSuccessMessage('✅ Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e: any) {
      setPasswordError(e.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getDepartmentName = (deptValue?: any) => {
    if (!deptValue) return 'Not assigned';
    // If it's an object with name/id properties
    if (typeof deptValue === 'object') {
      return deptValue?.name || 'Unknown';
    }
    // If it's a string ID, look it up
    const dept = departments.find(d => d.id === deptValue);
    return dept?.name || 'Unknown';
  };

  const getAvatarUrl = () => {
    if (user?.avatar) {
      return user.avatar.startsWith('http') ? user.avatar : `${user.avatar}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'default'}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
        <p className="text-slate-500">Manage your personal information and security preferences.</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card className="text-center">
            <div className="relative inline-block">
              <img 
                src={getAvatarUrl()} 
                alt={user?.name} 
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                onError={(e) => {
                  (e.target as any).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'default'}`;
                }}
              />
              <button className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors" title="Upload avatar (coming soon)">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-4">{user?.name}</h3>
            <p className="text-sm text-slate-500">{user?.role} • {getDepartmentName(user?.department)}</p>
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-500">Status</span>
                <span className={cn('font-bold uppercase text-[10px] px-2 py-0.5 rounded-full',
                  user?.status === 'ACTIVE' ? 'text-emerald-600 bg-emerald-50' :
                  user?.status === 'INACTIVE' ? 'text-slate-600 bg-slate-50' : 'text-rose-600 bg-rose-50'
                )}>
                  {user?.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Role</span>
                <span className="text-slate-900 font-medium">{user?.role}</span>
              </div>
            </div>
          </Card>

          <Card title="Security Status">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className={cn('p-2 rounded-lg',
                  user?.twoFactorEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                )}>
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">2FA Status</p>
                  <p className="text-[10px] text-slate-500">
                    {user?.twoFactorEnabled ? '✅ Enabled' : '❌ Disabled'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Current Device</p>
                  <p className="text-[10px] text-slate-500">{user?.device || 'Not detected'}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card title="Personal Information">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Full Name" 
                  value={profileForm.name}
                  onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                  required
                />
                <Input 
                  label="Email Address" 
                  type="email" 
                  value={profileForm.email}
                  disabled
                  title="Email cannot be changed"
                />
              </div>
              
              {profileError && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded">{profileError}</p>}
              
              <div className="pt-4 flex justify-end">
                <Button type="submit" isLoading={profileLoading}>
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Change Password">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input 
                label="Current Password" 
                type="password"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="New Password" 
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  required
                />
                <Input 
                  label="Confirm New Password" 
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  required
                />
              </div>
              
              {passwordError && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded">{passwordError}</p>}
              
              <div className="pt-4 flex justify-end">
                <Button 
                  type="submit" 
                  variant="outline"
                  isLoading={passwordLoading}
                >
                  <Key className="w-4 h-4 mr-2" /> Update Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
