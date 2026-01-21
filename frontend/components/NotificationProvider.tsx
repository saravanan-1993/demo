'use client';

import { useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationProviderProps {
  userId?: string;
  userType?: 'user' | 'admin';
  children: React.ReactNode;
}

export default function NotificationProvider({ userId, userType, children }: NotificationProviderProps) {
  const { setupNotifications } = useNotifications(userId, userType);

  useEffect(() => {
    // Setup notifications when user logs in
    if (userId && userType) {
      // Delay to ensure user is fully logged in
      const timer = setTimeout(() => {
        setupNotifications();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [userId, userType]);

  return <>{children}</>;
}
