'use client';

import { useEffect, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationProviderProps {
  userId?: string;
  userType?: 'user' | 'admin';
  children: React.ReactNode;
}

export default function NotificationProvider({ userId, userType, children }: NotificationProviderProps) {
  const { setupNotifications } = useNotifications(userId, userType);
  const hasSetup = useRef(false);

  useEffect(() => {
    // Setup notifications when user logs in (only once per session)
    if (userId && userType && !hasSetup.current) {
      // Delay to ensure user is fully logged in
      const timer = setTimeout(() => {
        setupNotifications();
        hasSetup.current = true;
      }, 2000);

      return () => clearTimeout(timer);
    }

    // Reset flag when user logs out
    if (!userId) {
      hasSetup.current = false;
    }
  }, [userId, userType, setupNotifications]);

  return <>{children}</>;
}
