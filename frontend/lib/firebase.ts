import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let messaging: Messaging | null = null;

// Initialize Firebase
export const initializeFirebase = () => {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized');
  } else {
    app = getApps()[0];
  }
  return app;
};

// Get Firebase Messaging instance
export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('⚠️ Firebase Messaging is not supported in this browser');
      return null;
    }

    if (!messaging) {
      const app = initializeFirebase();
      messaging = getMessaging(app);
      console.log('✅ Firebase Messaging initialized');
    }
    return messaging;
  } catch (error) {
    console.error('❌ Error initializing Firebase Messaging:', error);
    return null;
  }
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    // ✅ FIX: Check if token already exists in localStorage (same browser, multiple tabs)
    // This prevents generating multiple tokens for the same browser
    const cachedToken = localStorage.getItem('fcm_token');
    if (cachedToken) {
      console.log('✅ Using cached FCM token from localStorage');
      return cachedToken;
    }

    // Register service worker first
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ Service Worker registered:', registration);
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('✅ Service Worker ready');
      } catch (swError) {
        console.error('❌ Service Worker registration failed:', swError);
        // Continue anyway - foreground notifications will still work
      }
    }

    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('⚠️ Notification permission denied');
      return null;
    }

    console.log('✅ Notification permission granted');

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return null;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('❌ VAPID key not configured');
      return null;
    }

    const token = await getToken(messaging, { vapidKey });
    
    if (token) {
      console.log('✅ FCM Token generated:', token);
      // ✅ FIX: Cache token in localStorage to prevent duplicates
      localStorage.setItem('fcm_token', token);
      return token;
    } else {
      console.log('⚠️ No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = async (callback: (payload: any) => void) => {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return () => {};
    }

    return onMessage(messaging, (payload) => {
      console.log('📩 Foreground message received:', payload);
      callback(payload);
    });
  } catch (error) {
    console.error('❌ Error setting up message listener:', error);
    return () => {};
  }
};

export { app, messaging };
