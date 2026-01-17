"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function GoogleAuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Processing authentication...");

  useEffect(() => {
    const handleAuthSuccess = async () => {
      try {
        const token = searchParams.get("token");
        const userParam = searchParams.get("user");
        const error = searchParams.get("error");

        if (error) {
          setStatus("Authentication failed");
          setTimeout(() => router.push("/signin"), 2000);
          return;
        }

        if (!token || !userParam) {
          setStatus("Missing authentication data");
          setTimeout(() => router.push("/signin"), 2000);
          return;
        }

        // Parse user data
        const user = JSON.parse(decodeURIComponent(userParam));

        // Store token and user data
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        // Trigger auth refresh event to update AuthProvider immediately
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-refresh'));
        }

        // Track Google authentication success
        const isNewUser = searchParams.get("new_user") === "true";
        
        if (isNewUser) {
         
        } else {
         
        }

        setStatus("Authentication successful! Redirecting...");

        // Redirect based on role
        setTimeout(() => {
          if (user.role === 'admin') {
            router.replace("/dashboard");
            router.refresh();
          } else {
            router.replace("/");
            router.refresh();
          }
        }, 500);

      } catch (error) {
        console.error("Google auth success error:", error);
        setStatus("Error processing authentication");
        setTimeout(() => router.push("/signin"), 3000);
      }
    };

    handleAuthSuccess();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Google Authentication
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

export default function GoogleAuthSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Google Authentication
            </h2>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    }>
      <GoogleAuthSuccessContent />
    </Suspense>
  );
}