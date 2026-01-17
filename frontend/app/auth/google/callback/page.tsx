"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Processing...");

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
          setStatus("Authentication cancelled");
          setTimeout(() => router.push("/signin"), 2000);
          return;
        }

        if (!code) {
          setStatus("No authorization code received");
          setTimeout(() => router.push("/signin"), 2000);
          return;
        }

        setStatus("Exchanging code for tokens...");

        // Exchange code for tokens
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
            client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET!,
            code,
            grant_type: "authorization_code",
            redirect_uri: `${window.location.origin}/auth/google/callback`,
          }),
        });

        const tokens = await tokenResponse.json();

        if (!tokens.access_token) {
          throw new Error("Failed to get access token");
        }

        setStatus("Getting user information...");

        // Get user info from Google
        const userResponse = await fetch(
          `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`
        );
        const userInfo = await userResponse.json();

        setStatus("Authenticating with our server...");

        // Send to our backend
        const authResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google-callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            googleId: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            image: userInfo.picture,
          }),
        });

        const authData = await authResponse.json();

        if (authData.success) {
          // Store token and user data
          console.log('✅ Google Callback: Auth successful, storing data');
          localStorage.setItem("token", authData.data.token);
          localStorage.setItem("user", JSON.stringify(authData.data.user));
          console.log('📦 Google Callback: Data stored in localStorage');

          // Trigger auth refresh event to update AuthProvider immediately
          if (typeof window !== 'undefined') {
            console.log('📢 Google Callback: Dispatching auth-refresh event');
            window.dispatchEvent(new CustomEvent('auth-refresh'));
            // Also trigger storage event for cross-tab sync
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'user',
              newValue: JSON.stringify(authData.data.user),
              url: window.location.href
            }));
            console.log('📢 Google Callback: Events dispatched');
          }

          // Redirect based on role
          const user = authData.data.user;
          if (user.role === 'admin') {
            setStatus("Success! Redirecting to dashboard...");
            console.log('🔄 Google Callback: Redirecting to dashboard');
            // Use replace instead of push to avoid back button issues
            setTimeout(() => {
              router.replace("/dashboard");
              router.refresh();
            }, 500);
          } else {
            setStatus("Success! Redirecting to home...");
            console.log('🔄 Google Callback: Redirecting to home');
            // Use replace instead of push and refresh to ensure state updates
            setTimeout(() => {
              router.replace("/");
              router.refresh();
            }, 500);
          }
        } else {
          throw new Error(authData.error || "Authentication failed");
        }
      } catch (error) {
        console.error("Google OAuth error:", error);
        setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        setTimeout(() => router.push("/signin"), 3000);
      }
    };

    handleGoogleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Authenticating with Google
          </h2>
          <p className="mt-2 text-sm text-gray-600">{status}</p>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    </div>
  );
}

export default function GoogleCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}