import { useEffect, useState } from 'react';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase';
import { saveFCMToken } from '@/lib/fcmTokenService';
import { toast } from 'sonner';

interface NotificationPayload {
  notification?: {
    title: string;
    body: string;
    icon?: string;
    image?: string;
  };
  data?: {
    type?: string;
    link?: string;
    [key: string]: any;
  };
}

export const useNotifications = (userId?: string, userType?: 'user' | 'admin') => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Request notification permission and get FCM token
  const setupNotifications = async () => {
    if (!userId || !userType) {
      console.log('⚠️ User not logged in, skipping notification setup');
      return;
    }

    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.log('⚠️ This browser does not support notifications');
        return;
      }

      // Check current permission
      const currentPermission = Notification.permission;
      setNotificationPermission(currentPermission);

      if (currentPermission === 'denied') {
        console.log('⚠️ Notification permission denied');
        return;
      }

      // Request permission and get token
      const token = await requestNotificationPermission();
      
      if (token) {
        setFcmToken(token);
        
        // Save token to backend
        const result = await saveFCMToken(userId, token, userType);
        
        if (result.success) {
          console.log('✅ Notifications enabled successfully');
          // Toast removed - silent notification setup
        } else {
          console.error('❌ Failed to save FCM token to backend');
        }
      }
    } catch (error) {
      console.error('❌ Error setting up notifications:', error);
    }
  };

  // Listen for foreground messages
  useEffect(() => {
    if (!userId) return;

    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      unsubscribe = await onMessageListener((payload: NotificationPayload) => {
        console.log('📩 Notification received:', payload);

        const title = payload.notification?.title || 'New Notification';
        const body = payload.notification?.body || '';
        const link = payload.data?.link;
        const type = payload.data?.type || 'general';

        // Enhanced toast notification with icons based on type
        const getToastIcon = (notifType: string) => {
          switch (notifType) {
            case 'LOW_STOCK':
              return '⚠️';
            case 'ORDER_UPDATE':
              return '📦';
            case 'ORDER_PLACED':
              return '🎉';
            case 'NEW_USER_REGISTRATION':
              return '👤';
            case 'WELCOME':
              return '🎉';
            default:
              return '🔔';
          }
        };

        // Show attractive toast notification
        toast(title, {
          description: body,
          icon: getToastIcon(type),
          duration: 5000,
          action: link ? {
            label: '👁️ View',
            onClick: () => {
              window.location.href = link;
            },
          } : undefined,
          cancel: {
            label: '✖️',
            onClick: () => {
              console.log('Notification dismissed');
            },
          },
        });

        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          const notification = new Notification(title, {
            body,
            icon: payload.notification?.icon || '/logo.jpeg',
            badge: '/logo.jpeg',
            tag: payload.data?.type || 'notification',
            requireInteraction: type === 'ORDER_PLACED' || type === 'LOW_STOCK' || type === 'WELCOME',
            vibrate: [200, 100, 200],
          });

          // Handle notification click
          notification.onclick = () => {
            if (link) {
              window.focus();
              window.location.href = link;
            }
            notification.close();
          };
        }
      });
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  return {
    fcmToken,
    notificationPermission,
    setupNotifications,
  };
};
