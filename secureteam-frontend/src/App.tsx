import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { TwoFactorPage } from './pages/TwoFactorPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeePage } from './pages/EmployeePage';
import { DepartmentPage } from './pages/DepartmentPage';
import { ProjectPage } from './pages/ProjectPage';
import { TaskPage } from './pages/TaskPage';
import { DocumentPage } from './pages/DocumentPage';
import { AttendancePage } from './pages/AttendancePage';
import { ChatPage } from './pages/ChatPage';
import { SecurityLogPage } from './pages/SecurityLogPage';
import { ProfilePage } from './pages/ProfilePage';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { initAuth, isAuthenticated, is2FARequired } = useAuthStore();

  useEffect(() => {
    console.log('🔄 Initializing auth...');
    
    // Create a timeout to prevent infinite loading
    const initTimeout = setTimeout(() => {
      console.warn('⏱️ Auth initialization timeout - proceeding with loading');
      setIsInitialized(true);
    }, 8000); // 8 second timeout
    
    initAuth()
      .then(() => {
        console.log('✅ Auth initialized');
        clearTimeout(initTimeout);
        setIsInitialized(true);
      })
      .catch((err) => {
        console.error('❌ Auth init error:', err);
        clearTimeout(initTimeout);
        setIsInitialized(true); // Still render app even if init fails
      });
  }, [initAuth]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-xl">
            S
          </div>
          <p className="text-slate-600">Loading SecureTeam...</p>
        </div>
      </div>
    );
  }

  console.log('🔍 App.tsx render - isAuthenticated:', isAuthenticated, 'is2FARequired:', is2FARequired);

  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/2fa" element={<TwoFactorPage />} />
        </Route>

        {/* Dashboard Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeePage />} />
          <Route path="/departments" element={<DepartmentPage />} />
          <Route path="/projects" element={<ProjectPage />} />
          <Route path="/tasks" element={<TaskPage />} />
          <Route path="/documents" element={<DocumentPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/security-logs" element={<SecurityLogPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<ProfilePage />} /> {/* Reusing profile for demo */}
        </Route>

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
