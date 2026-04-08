// ============================================================
//  src/pages/LoginPage.tsx  ← THAY THẾ FILE CŨ
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';

export const LoginPage = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError, is2FARequired } = useAuthStore();
  const navigate = useNavigate();

  // ✅ Auto-navigate to 2FA when required
  useEffect(() => {
    console.log('🔍 LoginPage: is2FARequired =', is2FARequired);
    if (is2FARequired) {
      console.log('🔄 Navigating to 2FA page...');
      navigate('/2fa');
    }
  }, [is2FARequired, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Form submitted - calling login()...');
    clearError();
    await login(email, password);
  };

  return (
    <Card title="Welcome back" description="Enter your credentials to access your secure workspace"
      className="shadow-2xl shadow-slate-200/50 border-slate-200/60">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email address" type="email" placeholder="name@company.com" required
          value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <Input label="Password" type="password" placeholder="••••••••" required
          value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />

        {error && <p className="text-sm text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex items-center justify-between">
          <label className="flex items-center text-sm text-slate-700 gap-2 cursor-pointer">
            <input type="checkbox" className="rounded border-slate-300 text-indigo-600" />
            Remember me
          </label>
          <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Forgot password?</a>
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>Sign in</Button>

        
      </form>
    </Card>
  );
};
