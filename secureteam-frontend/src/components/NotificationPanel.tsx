import React, { useEffect } from 'react';
import { X, Bell, CheckCircle2, AlertTriangle, Briefcase, MessageSquare, Trash2, Check } from 'lucide-react';
import { useNotificationStore } from '../store/useNotificationStore';
import { cn } from '../utils/cn';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'MESSAGE':
      return <MessageSquare className="w-5 h-5 text-blue-500" />;
    case 'PROJECT_ASSIGNED':
      return <Briefcase className="w-5 h-5 text-emerald-500" />;
    case 'LOGIN_FAILED':
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    default:
      return <Bell className="w-5 h-5 text-slate-500" />;
  }
};

const getNotificationBgColor = (type: string) => {
  switch (type) {
    case 'MESSAGE':
      return 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20';
    case 'PROJECT_ASSIGNED':
      return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
    case 'LOGIN_FAILED':
      return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
    default:
      return 'bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20';
  }
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    isLoading,
    fetchNotifications, 
    markAsRead, 
    markAllAsRead,
    deleteNotification, 
    deleteAllNotifications 
  } = useNotificationStore();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('vi-VN');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-screen w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 flex items-center justify-between px-6 text-white">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <h2 className="text-lg font-bold">
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <button
              onClick={() => markAllAsRead()}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
            >
              <Check className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
            <button
              onClick={() => deleteAllNotifications()}
              className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center space-x-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear all</span>
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-500 dark:text-slate-400">Loading...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No notifications</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-slate-200 dark:divide-slate-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id || notification._id}
                  className={cn(
                    'p-4 border-l-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
                    notification.isRead
                      ? 'border-l-slate-300 dark:border-l-slate-700 bg-white dark:bg-slate-900'
                      : 'border-l-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {notification.title}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id || notification._id)}
                          className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id || notification._id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
