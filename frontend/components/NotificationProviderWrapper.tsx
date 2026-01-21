'use client';

import { useAuthContext } from '@/components/providers/auth-provider';
import NotificationProvider from '@/components/NotificationProvider';

interface NotificationProviderWrapperProps {
  children: React.ReactNode;
}

export default function NotificationProviderWrapper({ children }: NotificationProviderWrapperProps) {
  const { user, isAuthenticated } = useAuthContext();

  // Determine user type based on role
  const userType = user?.role === 'admin' ? 'admin' : user?.role === 'user' ? 'user' : undefined;
  const userId = isAuthenticated && user ? user.id : undefined;

  return (
    <NotificationProvider userId={userId} userType={userType}>
      {children}
    </NotificationProvider>
  );
}
