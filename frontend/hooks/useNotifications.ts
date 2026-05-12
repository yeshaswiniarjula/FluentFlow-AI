'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { NotificationType } from '../components/NotificationToast';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  addNotification: (message: string, type: NotificationType) => void;
  removeNotification: (id: string) => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType) => {
    const id = uuidv4();
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notifications, addNotification, removeNotification };
}
