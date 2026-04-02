import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const AuthLayout = () => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    console.log(`🔐 AuthLayout at ${location.pathname}, isAuthenticated: ${isAuthenticated}`);
  }, [isAuthenticated, location.pathname]);

  // Only redirect if we're not already on an auth page
  if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/2fa')) {
    console.log('↩️ Redirecting to dashboard (already authenticated)');
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8 space-x-3">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-indigo-500/20">
            S
          </div>
          <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">SecureTeam</span>
        </div>
        <Outlet />
      </div>
    </div>
  );
};
