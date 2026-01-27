import { useEffect, useState } from 'react';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase';
import { saveFCMToken } from '@/lib/fcmTokenService';
import { toast } from 'sonner';

interface NotificationPayload {
  messageId?: string;
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
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  // Request notification permission and get FCM token
  const setupNotifications = async () => {
    if (!userId || !userType) {
      console.log('⚠️ User not logged in, skipping notification setup');
      return;
    }

    // ✅ Prevent multiple setup calls for the same user
    if (isSetupComplete) {
      console.log('✅ Notifications already setup for this session');
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
        
        // Save token to backend (with localStorage caching to prevent duplicates)
        const result = await saveFCMToken(userId, token, userType);
        
        if (result.success) {
          console.log('✅ Notifications enabled successfully');
          setIsSetupComplete(true);
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
    let isMounted = true;

    const setupListener = async () => {
      try {
        const unsub = await onMessageListener((payload: NotificationPayload) => {
          console.log('📩 Notification received:', payload);

          const title = payload.notification?.title || payload.data?.notifTitle || payload.data?.title || 'New Notification';
          const body = payload.notification?.body || payload.data?.notifBody || payload.data?.body || '';
          const link = payload.data?.link;
          const type = payload.data?.type || 'general';

          // ✅ FILTER: Only show notifications relevant to user type
          const adminOnlyNotifications = [
            'LOW_STOCK', 'OUT_OF_STOCK', 'DAILY_STOCK_SUMMARY',
            'EXPIRY_WARNING', 'URGENT_EXPIRY', 'CRITICAL_EXPIRY', 'DAILY_EXPIRY_SUMMARY',
            'NEW_USER_REGISTRATION', 'NEW_ORDER', 'NEW_POS_ORDER', 'PURCHASE_ORDER'
          ];

          // Skip admin-only notifications for regular users
          if (userType === 'user' && adminOnlyNotifications.includes(type)) {
            console.log(`⚠️ Skipping admin-only notification for user: ${type}`);
            return;
          }

          // ✅ FILTER: Skip user-only notifications for admins (Fixes localhost shared-token issue)
          const userOnlyNotifications = [
            'ORDER_UPDATE', 'ORDER_PLACED', 'WELCOME',
            'PRICE_DROP', 'BACK_IN_STOCK', 'ABANDONED_CART', 'OUT_FOR_DELIVERY'
          ];
          if (userType === 'admin' && userOnlyNotifications.includes(type)) {
            console.log(`⚠️ Skipping user-only notification for admin: ${type}`);
            return;
          }

          // Show attractive toast notification
          const getToastIcon = (notifType: string) => {
            // Return undefined to use default toast styling without emojis
            return undefined;
          };

          toast(title, {
            description: body,
            duration: 5000,
            action: link ? {
              label: 'View',
              onClick: () => {
                window.location.href = link;
              },
            } : undefined,
            cancel: {
              label: 'Dismiss',
              onClick: () => {
                console.log('Notification dismissed');
              },
            },
          });

          // Show system notification (Conditional)
          // If the notification has 'actions', the Service Worker handles it in background.
          // However, for USER notifications (like Order Placed), we MUST show them in foreground 
          // because the SW often doesn't trigger for foreground apps.
          const hasActions = payload.data?.actions;
          const isUserImportant = ['ORDER_PLACED', 'ORDER_UPDATE', 'WELCOME'].includes(type);
          
          if ((!hasActions || isUserImportant) && 'Notification' in window && Notification.permission === 'granted') {
            const notificationData: NotificationOptions = {
              body,
              icon: payload.notification?.icon || '/logo.jpeg',
              // @ts-ignore
              image: payload.notification?.image || payload.data?.notifImage || payload.data?.image,
              tag: payload.messageId,
              data: payload.data,
            };
            new Notification(title, notificationData);
          }
        });

        if (isMounted) {
          unsubscribe = unsub;
        } else if (unsub) {
          unsub();
        }
      } catch (error) {
        console.error('Failed to setup notification listener:', error);
      }
    };

    setupListener();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId, userType]);

  return {
    fcmToken,
    notificationPermission,
    setupNotifications,
  };
};
