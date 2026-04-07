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
import { useThemeStore } from '../store/useThemeStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { cn } from '../utils/cn';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';
import { NotificationPanel } from '../components/NotificationPanel';
import io from 'socket.io-client';

export const DashboardLayout = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { unreadCount, addNotification, fetchUnreadCount } = useNotificationStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Set up WebSocket listener for real-time notifications
  useEffect(() => {
    if (!user?.id) return;

    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    
    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
      socket.emit('user:join', { userId: user.id, userName: user.name });
    });

    socket.on('notification:new', (notification) => {
      console.log('📬 New notification received:', notification);
      addNotification(notification);
      // Also update unread count
      fetchUnreadCount();
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket');
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id, user?.name, addNotification, fetchUnreadCount]);

  // Fetch initial unread count
  useEffect(() => {
    if (user?.id) {
      fetchUnreadCount();
    }
  }, [user?.id, fetchUnreadCount]);

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

          <div className="pt-4 mt-4 border-t border-slate-900 space-y-2">
            <ThemeToggle isSidebarOpen={isSidebarOpen} />
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
        <header className="h-16 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-b border-white/20 dark:border-slate-800/40 flex items-center justify-between px-4 lg:px-8 z-40 sticky top-0 shadow-sm shadow-indigo-500/5 dark:shadow-slate-900/20">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-3 py-1.5 w-64 lg:w-96 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/40 transition-all">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2" />
              <input 
                type="text" 
                placeholder="Search projects, tasks, people..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 lg:space-x-4">
            <button 
              onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 text-white text-xs flex items-center justify-center font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all"
              >
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm"
                />
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">{user.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-bold">{user.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 hidden lg:block" />
              </button>

              {isUserMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsUserMenuOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 py-1 z-20">
                    <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">Your Profile</Link>
                    <Link to="/settings" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">Settings</Link>
                    <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
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
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-transparent dark:bg-slate-950/30">
          <Outlet />
        </main>
      </div>

      {/* Notification Panel */}
      <NotificationPanel isOpen={isNotificationPanelOpen} onClose={() => setIsNotificationPanelOpen(false)} />
    </div>
  );
};
