import { create } from 'zustand';
import { api } from '../api/client';

export interface Notification {
  id: string;
  _id?: string;
  recipientId: string;
  type: 'MESSAGE' | 'PROJECT_ASSIGNED' | 'LOGIN_FAILED' | 'SYSTEM';
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  relatedData?: Record<string, any>;
  actionUrl?: string;
  createdAt: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  // Actions
  fetchNotifications: (skip?: number, limit?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  
  // WebSocket notification
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  
  fetchNotifications: async (skip = 0, limit = 20) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/notifications?skip=${skip}&limit=${limit}`);
      set({
        notifications: response.data.notifications,
        unreadCount: response.data.unreadCount,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      set({ isLoading: false });
    }
  },
  
  fetchUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread/count');
      set({ unreadCount: response.data.unreadCount });
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  },
  
  markAsRead: async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      const notifications = get().notifications.map(n =>
        n.id === id || n._id === id ? { ...n, isRead: true } : n
      );
      const unreadCount = notifications.filter(n => !n.isRead).length;
      set({ notifications, unreadCount });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },
  
  markAllAsRead: async () => {
    try {
      await api.patch('/notifications/mark-all/read');
      const notifications = get().notifications.map(n => ({ ...n, isRead: true }));
      set({ notifications, unreadCount: 0 });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  },
  
  deleteNotification: async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      const notifications = get().notifications.filter(n => n.id !== id && n._id !== id);
      const unreadCount = notifications.filter(n => !n.isRead).length;
      set({ notifications, unreadCount });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  },
  
  deleteAllNotifications: async () => {
    try {
      await api.delete('/notifications');
      set({ notifications: [], unreadCount: 0 });
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  },
  
  addNotification: (notification: Notification) => {
    const notifications = [notification, ...get().notifications];
    const unreadCount = notifications.filter(n => !n.isRead).length;
    set({ notifications, unreadCount });
  },
  
  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  }
}));
