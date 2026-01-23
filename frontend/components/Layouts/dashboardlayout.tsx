"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Dashboard/sidebar/app-sidebar";
import { DashboardNavbar } from "@/components/Dashboard/sidebarNavbar/dashboard-navbar";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import axiosInstance from "@/lib/axios";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      // Check authentication
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        router.replace("/signin");
        return;
      }

      try {
        // Validate token expiry
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("fcm_token"); // ✅ Clear FCM token on expiry
          router.replace("/signin");
          return;
        }

        const userData = JSON.parse(userStr);

        // For admin users, fetch fresh data from server to check onboarding status
        if (userData.role === "admin") {
          try {
            const response = await axiosInstance.get("/api/auth/admin/me");
            
            if (response.data.success) {
              const serverUserData = response.data.data;
              
              // Update localStorage with fresh data
              const updatedUser = {
                ...userData,
                onboardingCompleted: serverUserData.onboardingCompleted,
                name: serverUserData.name,
                phoneNumber: serverUserData.phoneNumber,
                companyName: serverUserData.companyName,
              };
              localStorage.setItem("user", JSON.stringify(updatedUser));

              // Check if admin needs onboarding (skip if already on onboarding page)
              if (!serverUserData.onboardingCompleted && pathname !== "/onboarding") {
                router.replace("/onboarding");
                return;
              }

              // If on onboarding page but already completed, redirect to dashboard
              if (serverUserData.onboardingCompleted && pathname === "/onboarding") {
                router.replace("/dashboard");
                return;
              }
            }
          } catch (error) {
            console.error("Error fetching admin profile:", error);
            // If API fails, fall back to localStorage data
            if (!userData.onboardingCompleted && pathname !== "/onboarding") {
              router.replace("/onboarding");
              return;
            }
          }
        }

        setIsCheckingAuth(false);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("fcm_token"); // ✅ Clear FCM token on error
        router.replace("/signin");
        return;
      }
    };

    checkAuthAndOnboarding();
  }, [router, pathname]);

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If on onboarding page, render without sidebar/navbar
  if (pathname === "/onboarding") {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardNavbar />

          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </ErrorBoundary>
  );
}
