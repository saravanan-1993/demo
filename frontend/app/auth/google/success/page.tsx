'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { requestNotificationPermission } from '@/lib/firebase';
import { saveFCMToken } from '@/lib/fcmTokenService';

function GoogleAuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const handleGoogleAuthSuccess = async () => {
      try {
        const token = searchParams.get('token');
        const userStr = searchParams.get('user');

        if (!token || !userStr) {
          setStatus('error');
          setTimeout(() => router.replace('/signin'), 2000);
          return;
        }

        const user = JSON.parse(decodeURIComponent(userStr));

        // Store auth data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Trigger auth refresh event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-refresh'));
        }

        // Generate and save FCM token
        try {
          console.log('📱 Generating FCM token after Google OAuth...');
          const fcmToken = await requestNotificationPermission();
          
          if (fcmToken) {
            console.log('✅ FCM token generated:', fcmToken);
            
            // Save FCM token to backend
            const result = await saveFCMToken(user.id, fcmToken, user.role);
            
            if (result.success) {
              console.log('✅ FCM token saved to backend');
            } else {
              console.error('❌ Failed to save FCM token:', result.message);
            }
          } else {
            console.log('⚠️ User denied notification permission or FCM not supported');
          }
        } catch (fcmError) {
          console.error('❌ FCM token generation failed:', fcmError);
          // Continue with login even if FCM fails
        }

        setStatus('success');

        // Redirect based on role
        setTimeout(() => {
          if (user.role === 'admin') {
            router.replace('/dashboard');
          } else {
            router.replace('/');
          }
        }, 1000);

      } catch (error) {
        console.error('Google auth success handler error:', error);
        setStatus('error');
        setTimeout(() => router.replace('/signin'), 2000);
      }
    };

    handleGoogleAuthSuccess();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 shadow-sm max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="h-16 w-16 mx-auto mb-4 animate-spin rounded-full border-4 border-gray-200 border-t-[#E63946]" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Completing Sign In...
            </h2>
            <p className="text-gray-600 text-sm">
              Setting up your account and notifications
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="h-16 w-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Success!
            </h2>
            <p className="text-gray-600 text-sm">
              Redirecting to your dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="h-16 w-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 text-sm">
              Redirecting to sign in...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoogleAuthSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 shadow-sm max-w-md w-full text-center">
          <div className="h-16 w-16 mx-auto mb-4 animate-spin rounded-full border-4 border-gray-200 border-t-[#E63946]" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Loading...
          </h2>
        </div>
      </div>
    }>
      <GoogleAuthSuccessContent />
    </Suspense>
  );
}
