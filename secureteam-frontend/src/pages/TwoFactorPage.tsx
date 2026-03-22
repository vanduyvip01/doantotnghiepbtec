// ============================================================
//  src/pages/TwoFactorPage.tsx
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export const TwoFactorPage = () => {
  const [code, setCode]     = useState(['', '', '', '', '', '']);
  const [timer, setTimer]   = useState(30);
  const [attempts, setAttempts] = useState(0);
  const { verify2FA, is2FARequired, isLoading, error, clearError, exit2FA } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (timer > 0) {
      const t = setInterval(() => setTimer(v => v - 1), 1000);
      return () => clearInterval(t);
    }
  }, [timer]);

  if (!is2FARequired) return <Navigate to="/login" replace />;

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);
    if (val && i < 5) document.getElementById(`c-${i + 1}`)?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) document.getElementById(`c-${i - 1}`)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const full = code.join('');
    if (full.length !== 6) {
      return;
    }
    
    console.log(`🔐 Submitting 2FA code: ${full}`);
    setAttempts(attempts + 1);
    const ok = await verify2FA(full);
    if (ok) {
      console.log(`✅ 2FA verification successful, redirecting to dashboard`);
      navigate('/dashboard');
    } else {
      console.log(`❌ 2FA verification failed (attempt ${attempts + 1})`);
      // Reset code fields on failure
      setCode(['', '', '', '', '', '']);
      document.getElementById(`c-0`)?.focus();
    }
  };

  return (
    <Card className="text-center shadow-2xl shadow-slate-200/50 border-slate-200/60">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
          <ShieldCheck className="w-8 h-8" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Xác thực hai yếu tố</h2>
      <p className="text-slate-500 text-sm mb-8">Nhập mã 6 chữ số từ Google Authenticator.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between gap-2">
          {code.map((digit, i) => (
            <input key={i} id={`c-${i}`} type="text" inputMode="numeric" maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-2xl font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 outline-none transition-all"
            />
          ))}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700 text-left">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" isLoading={isLoading}>
            {isLoading ? 'Đang xác thực...' : 'Xác nhận & Tiếp tục'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              exit2FA();
              navigate('/login');
            }}
            className="flex-1"
          >
            Quay lại
          </Button>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <p className="text-sm text-slate-500">
            {timer > 0 ? `Gửi lại trong ${timer}s` : (
              <button type="button" onClick={() => setTimer(30)} className="font-medium text-indigo-600 flex items-center gap-1 justify-center">
                <RefreshCw className="w-3 h-3" /> Gửi lại mã
              </button>
            )}
          </p>
          <p className="text-xs text-slate-400">Lấy mã 6 chữ số từ ứng dụng Google Authenticator</p>
          {attempts > 2 && (
            <p className="text-xs text-amber-600 mt-2">
              💡 Mẹo: Hãy chắc chắn thời gian trên điện thoại đã đồng bộ. Hãy thử mã mới ngay lập tức.
            </p>
          )}
        </div>
      </form>
    </Card>
  );
};

