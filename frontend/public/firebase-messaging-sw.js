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

// ✅ FIX: Force new service worker to activate immediately
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Installing new version...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Activating new version...');
  event.waitUntil(clients.claim());
});

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  console.log('[firebase-messaging-sw.js] Full Payload JSON:', JSON.stringify(payload));
  if (payload.data) {
    console.log('[firebase-messaging-sw.js] Data Keys:', Object.keys(payload.data));
    console.log('[firebase-messaging-sw.js] notifTitle:', payload.data.notifTitle);
    console.log('[firebase-messaging-sw.js] notifBody:', payload.data.notifBody);
  }
  console.log('[firebase-messaging-sw.js] Data Payload:', payload.data);

  // ✅ FILTER: Check if notification should be shown based on type
  // This prevents duplicate notifications and filters admin-only notifications
  const notificationType = payload.data?.type || payload.data?.notificationType || 'general';
  


  // Note: Service worker cannot access userType directly
  // Backend should only send admin notifications to admin FCM tokens
  // This is a safety check in case backend sends wrong notification
  
  // Get logo URL from payload data or use default
  const logoUrl = payload.data?.logoUrl || '/logo.jpeg';

  // ✅ Fix: Extract title and body from data payload (using custom keys to be safe)
  const notificationTitle = payload.notification?.title || payload.data?.notifTitle || payload.data?.title || 'New Notification (Updated)';
  console.log('[firebase-messaging-sw.js] Resolved Title:', notificationTitle);
  const notificationBody = payload.notification?.body || payload.data?.notifBody || payload.data?.body || '';

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

  // ✅ FIX: Create stable tag to prevent duplicate notifications
  // Use itemName + expiryDate OR orderNumber to create unique but stable tag
  // This ensures same notification replaces previous one instead of creating duplicates
  let uniqueTag = 'notification';
  
  if (payload.data?.itemName && payload.data?.expiryDateRaw) {
    // For expiry notifications: use itemName + expiryDateRaw (stable date format)
    uniqueTag = `expiry-${payload.data.itemName}-${payload.data.expiryDateRaw}`;
  } else if (payload.data?.itemName && payload.data?.warehouseRaw) {
    // For stock notifications: use itemName + warehouseRaw (stable identifier)
    uniqueTag = `stock-${payload.data.itemName}-${payload.data.warehouseRaw}`;
  } else if (payload.data?.orderNumber) {
    // For order notifications: use orderNumberRaw (stable identifier)
    uniqueTag = `order-${payload.data.orderNumberRaw || payload.data.orderNumber}`;
  } else if (payload.data?.poId) {
    // For PO notifications: use poId
    uniqueTag = `po-${payload.data.poId}`;
  } else if (payload.data?.productId && payload.data?.type === 'PRICE_DROP') {
    // For price drop notifications: use productId
    uniqueTag = `price-drop-${payload.data.productId}`;
  } else if (payload.data?.productId && payload.data?.type === 'BACK_IN_STOCK') {
    // For back in stock notifications: use productId
    uniqueTag = `back-in-stock-${payload.data.productId}`;
  } else if (payload.data?.type === 'ABANDONED_CART') {
    // For abandoned cart: use type + reminderType
    uniqueTag = `abandoned-cart-${payload.data.reminderType || 'reminder'}`;
  } else {
    // Fallback: use type + timestamp (will create new notification each time)
    uniqueTag = `${payload.data?.type || 'notification'}-${Date.now()}`;
  }
  
  console.log('[firebase-messaging-sw.js] Using tag:', uniqueTag);
  
  const notificationOptions = {
    body: notificationBody,
    icon: logoUrl, // Use company logo from backend
    badge: logoUrl, // Use company logo from backend
    image: payload.notification?.image || payload.data?.notifImage || payload.data?.image,
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
    renotify: false, // Don't re-alert for same tag
    // ✅ FIX: Add these to prevent duplicates
    sticky: false, // Allow notification to be dismissed
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
