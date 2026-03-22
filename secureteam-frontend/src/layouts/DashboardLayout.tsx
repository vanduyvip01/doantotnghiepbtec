import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  Briefcase, 
  CheckSquare, 
  FileText, 
  Clock, 
  MessageSquare, 
  ShieldAlert, 
  Settings, 
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  User as UserIcon
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../utils/cn';
import { Button } from '../components/Button';

export const DashboardLayout = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log(`📊 DashboardLayout at ${location.pathname}, isAuthenticated: ${isAuthenticated}, user: ${user?.name}`);
  }, [isAuthenticated, user, location.pathname]);

  // Protected route check
  if (!isAuthenticated) {
    console.log('🔐 Not authenticated, redirecting to login from', location.pathname);
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    console.log('👤 No user object');
    return <Navigate to="/login" replace />;
  }

  const menuItems = {
    ADMIN: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: Users, label: 'Employees', path: '/employees' },
      { icon: Layers, label: 'Departments', path: '/departments' },
      { icon: Briefcase, label: 'Projects', path: '/projects' },
      { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
      { icon: FileText, label: 'Documents', path: '/documents' },
      { icon: Clock, label: 'Attendance', path: '/attendance' },
      { icon: MessageSquare, label: 'Chat', path: '/chat' },
      { icon: ShieldAlert, label: 'Security Logs', path: '/security-logs' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ],
    PM: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: Briefcase, label: 'My Projects', path: '/projects' },
      { icon: CheckSquare, label: 'Project Tasks', path: '/tasks' },
      { icon: FileText, label: 'Documents', path: '/documents' },
      { icon: Clock, label: 'Attendance', path: '/attendance' },
      { icon: MessageSquare, label: 'Chat', path: '/chat' },
      { icon: UserIcon, label: 'Profile', path: '/profile' },
    ],
    MEMBER: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: CheckSquare, label: 'My Tasks', path: '/tasks' },
      { icon: Briefcase, label: 'My Projects', path: '/projects' },
      { icon: Clock, label: 'Attendance', path: '/attendance' },
      { icon: FileText, label: 'Documents', path: '/documents' },
      { icon: MessageSquare, label: 'Chat', path: '/chat' },
      { icon: UserIcon, label: 'Profile', path: '/profile' },
    ]
  };

  const currentMenu = menuItems[user.role];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-mesh flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-slate-950 to-slate-900 text-slate-400 transition-all duration-300 ease-in-out lg:relative",
          isSidebarOpen ? "w-64" : "w-20",
          !isSidebarOpen && "lg:w-20"
        )}
      >
        <div className="flex h-16 items-center px-6 border-b border-slate-900">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg shadow-indigo-500/20">
              S
            </div>
            {isSidebarOpen && <span className="text-white font-bold text-xl tracking-tight">SecureTeam</span>}
          </div>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {currentMenu.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                location.pathname === item.path 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "hover:bg-slate-900 hover:text-slate-200"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", location.pathname === item.path ? "text-white" : "text-slate-500 group-hover:text-slate-200")} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}

          <div className="pt-4 mt-4 border-t border-slate-900">
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left hover:bg-rose-500/10 hover:text-rose-500 group"
              )}
            >
              <LogOut className="w-5 h-5 flex-shrink-0 text-slate-500 group-hover:text-rose-500" />
              {isSidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white/40 backdrop-blur-xl border-b border-white/20 flex items-center justify-between px-4 lg:px-8 z-40 sticky top-0 shadow-sm shadow-indigo-500/5">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-1.5 w-64 lg:w-96 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/40 transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search projects, tasks, people..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 lg:space-x-4">
            <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
              >
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full border border-slate-200 shadow-sm"
                />
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-bold text-slate-900 leading-none">{user.name}</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">{user.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden lg:block" />
              </button>

              {isUserMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsUserMenuOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
                    <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Your Profile</Link>
                    <Link to="/settings" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Settings</Link>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
