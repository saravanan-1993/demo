// Firebase Cloud Messaging Service Worker
// This file handles background notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDv8EGBIIAtBEQXxK_XkJTRuQUlo6Jbcng",
  authDomain: "ecommerce-48af3.firebaseapp.com",
  projectId: "ecommerce-48af3",
  storageBucket: "ecommerce-48af3.firebasestorage.app",
  messagingSenderId: "984058403389",
  appId: "1:984058403389:web:8c1b790e34706fb65e6854"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Get logo URL from payload data or use default
  const logoUrl = payload.data?.logoUrl || '/logo.jpeg';
  const notificationType = payload.data?.notificationType || 'general';

  const notificationTitle = payload.notification?.title || 'New Notification';
  
  // Parse actions if provided
  let actions = [];
  try {
    if (payload.data?.actions) {
      actions = typeof payload.data.actions === 'string' 
        ? JSON.parse(payload.data.actions) 
        : payload.data.actions;
    }
  } catch (e) {
    console.error('Failed to parse actions:', e);
  }

  // Create unique tag to prevent duplicate notifications
  // Using timestamp ensures each notification is unique
  const uniqueTag = `${payload.data?.type || 'notification'}-${Date.now()}`;
  
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: logoUrl, // Use company logo from backend
    badge: logoUrl, // Use company logo from backend
    image: payload.notification?.image,
    data: payload.data,
    tag: uniqueTag, // Unique tag prevents duplicates
    requireInteraction: payload.data?.requireInteraction === 'true' || payload.data?.requireInteraction === true,
    vibrate: payload.data?.vibrate ? JSON.parse(payload.data.vibrate) : [200, 100, 200],
    timestamp: Date.now(),
    // Action buttons
    actions: actions.length > 0 ? actions : [
      {
        action: 'view',
        title: '👁️ View',
      },
      {
        action: 'dismiss',
        title: '✖️ Close',
      },
    ],
    // Visual enhancements
    silent: false,
    renotify: false, // ❌ FIXED: Changed from true to false to prevent duplicate notifications
  };

  console.log('[firebase-messaging-sw.js] Using logo URL:', logoUrl);
  console.log('[firebase-messaging-sw.js] Notification type:', notificationType);

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  console.log('[firebase-messaging-sw.js] Action clicked:', event.action);

  event.notification.close();

  // Handle different actions
  if (event.action === 'dismiss') {
    // Just close the notification
    return;
  }

  if (event.action === 'share') {
    // Handle share action
    const shareData = {
      title: event.notification.title,
      text: event.notification.body,
      url: event.notification.data?.link || '/',
    };
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].focus();
          clientList[0].postMessage({
            type: 'SHARE',
            data: shareData,
          });
        }
      })
    );
    return;
  }

  // Default action or 'view' action - open the link
  const urlToOpen = event.notification.data?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(urlToOpen.split('?')[0]) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
