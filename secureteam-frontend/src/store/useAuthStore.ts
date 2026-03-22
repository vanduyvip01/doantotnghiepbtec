// ============================================================
//  src/store/useAuthStore.ts  ← THAY THẾ FILE CŨ
// ============================================================
import { create } from 'zustand';
import { User } from '../types';
import { api } from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  is2FARequired: boolean;
  tempToken: string | null;   // token tạm sau bước 1 login
  error: string | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  verify2FA: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
  exit2FA: () => void;  // Exit 2FA and go back to login
  initAuth: () => Promise<void>;  // khôi phục session khi reload trang
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  is2FARequired: false,
  tempToken: null,
  error: null,
  isLoading: false,

  // ── Bước 1: Đăng nhập bằng email + password ────────────────
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      console.log(`📤 Sending login request for: ${email}`);
      const data = await api.post<{ requires2FA: boolean; tempToken?: string; token?: string; user: User }>(
        '/auth/login',
        { email, password }
      );
      
      console.log('📥 Login response received:', { requires2FA: data.requires2FA, hasToken: !!data.token, hasTempToken: !!data.tempToken });
      
      // ✅ Handle case: 2FA DISABLED → Direct login
      if (!data.requires2FA && data.token) {
        console.log('✅ 2FA disabled - logging in directly');
        localStorage.setItem('token', data.token);
        localStorage.removeItem('_tempToken_2fa');
        set({
          user: data.user,
          isAuthenticated: true,
          is2FARequired: false,
          tempToken: null,
          isLoading: false
        });
        console.log('✅ State updated - should redirect to dashboard');
        return;
      }
      
      // ✅ Handle case: 2FA ENABLED → Need verification
      if (data.requires2FA && data.tempToken) {
        console.log('✅ 2FA enabled - need verification');
        localStorage.setItem('_tempToken_2fa', data.tempToken);
        set({
          is2FARequired: true,
          tempToken: data.tempToken,
          user: data.user,
          isLoading: false
        });
        console.log('✅ 2FA state updated - should redirect to 2FA page');
        return;
      }
      
      console.error('❌ Invalid login response:', data);
      throw new Error('Invalid login response - missing token or tempToken');
    } catch (err: any) {
      console.error('❌ Login failed:', err.message);
      localStorage.removeItem('_tempToken_2fa');
      set({ error: err.message, isLoading: false });
    }
  },

  // ── Bước 2: Xác nhận mã 2FA ────────────────────────────────
  verify2FA: async (code) => {
    set({ isLoading: true, error: null });
    try {
      console.log(`🔐 Verifying 2FA code: ${code}`);
      
      // Use persisted tempToken if not in store (page refresh recovery)
      let { tempToken } = get();
      if (!tempToken) {
        tempToken = localStorage.getItem('_tempToken_2fa');
        console.log(`📦 Recovered tempToken from localStorage: ${tempToken ? 'YES' : 'NO'}`);
        if (!tempToken) {
          throw new Error('Phiên đã hết hạn. Vui lòng đăng nhập lại.');
        }
      }
      
      console.log(`📤 Sending verify2FA request with code length: ${code.length}`);
      const data = await api.post<{ token: string; user: User }>(
        '/auth/verify-2fa',
        { tempToken, code }
      );
      
      console.log(`✅ 2FA verification successful!`);
      localStorage.setItem('token', data.token);
      // ✅ Clean up temporary token after successful verification
      localStorage.removeItem('_tempToken_2fa');
      set({
        user: data.user,
        isAuthenticated: true,
        is2FARequired: false,
        tempToken: null,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      console.error(`❌ 2FA verification error: ${err.message}`);
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  // ── Đăng xuất ──────────────────────────────────────────────
  logout: async () => {
    try { await api.post('/auth/logout', {}); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('_tempToken_2fa');  // ✅ Clear 2FA token on logout
    set({ user: null, isAuthenticated: false, is2FARequired: false, tempToken: null, error: null });
  },

  setUser: (user) => set({ user }),

  clearError: () => set({ error: null }),

  // ── Exit 2FA and go back to login ──────────────────────────
  exit2FA: () => {
    console.log('👋 Exiting 2FA, clearing tokens...');
    localStorage.removeItem('_tempToken_2fa');
    // ✅ Clear user data when exiting 2FA flow (not fully authenticated)
    set({ tempToken: null, is2FARequired: false, error: null, user: null });
  },

  // ── Khôi phục session khi F5 / reload ──────────────────────
  initAuth: async () => {
    // ✅ Check for ongoing 2FA session (temp token in localStorage)
    const tempToken = localStorage.getItem('_tempToken_2fa');
    if (tempToken) {
      console.log('🔐 Restoring 2FA session...');
      set({ tempToken, is2FARequired: true });
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ No token in storage');
      return;
    }
    try {
      console.log('🔐 Fetching user profile...');
      const userData = await api.get<any>('/auth/me');
      // ✅ Normalize _id to id
      const user: User = {
        id: userData._id || userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department?.name || userData.department,
        status: userData.status,
        avatar: userData.avatar,
        twoFactorEnabled: userData.twoFactorEnabled,
      };
      console.log('✅ User loaded:', user.name);
      set({ user, isAuthenticated: true });
    } catch (err: any) {
      console.error('❌ Profile fetch failed:', err.message);
      localStorage.removeItem('token');
    }
  },
}));
  