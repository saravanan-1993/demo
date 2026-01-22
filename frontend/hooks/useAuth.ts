"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types/auth";
import axiosInstance from "@/lib/axios";

export const useAuth = (requireAuth: boolean = true) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client flag immediately
    setIsClient(true);
    
    const checkAuth = async () => {
      try {
        // Ensure we're on the client side
        if (typeof window === 'undefined') {
          setIsLoading(false);
          return;
        }

        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        // Don't redirect on root path
        const isRootPath = window.location.pathname === "/";
        
        if (!token || !userData) {
          if (requireAuth && !isRootPath) {
            router.push("/signin");
          }
          setIsLoading(false);
          return;
        }

        // Validate token expiry
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Date.now() / 1000;
          
          if (payload.exp <= currentTime) {
            // Token expired
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setUser(null);
            setIsAuthenticated(false);
            if (requireAuth && !isRootPath) {
              router.push("/signin");
            }
            setIsLoading(false);
            return;
          }
        } catch {
          // Invalid token
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          setIsAuthenticated(false);
          if (requireAuth && !isRootPath) {
            router.push("/signin");
          }
          setIsLoading(false);
          return;
        }

        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (parseError) {
          // Silent handling - no console logs
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          setIsAuthenticated(false);
          if (requireAuth && !isRootPath) {
            router.push("/signin");
          }
        }
      } catch (error) {
        // Silent handling - no console logs
        if (requireAuth) {
          router.push("/signin");
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Listen for auth failures from axios interceptor
    const handleAuthFailure = () => {
      // Silent handling - no console logs
      setUser(null);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined' && window.location.pathname !== '/signin') {
        router.push('/signin');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth-failure', handleAuthFailure);
    }

    checkAuth();

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth-failure', handleAuthFailure);
      }
    };
  }, [router, requireAuth]);

  const logout = async () => {
    // Silent logout - no console logs
    
    try {
      // Call backend logout first while token is still valid
      try {
        await axiosInstance.post('/api/auth/logout');
      } catch (error) {
        // Silent error handling
      }
      
      // Clear local storage after backend call
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Clear state immediately to prevent UI issues
      setUser(null);
      setIsAuthenticated(false);
      
      // Only navigate if we're not already on the home page
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        router.push('/');
        // Refresh the page after 1 second
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      
    } catch (error) {
      // Silent error handling
      
      // Even if there's an error, clear the state
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Navigate to home on error
      if (typeof window !== 'undefined') {
        router.push('/');
        // Refresh the page after 1 second even on error
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  };

  const login = (token: string, userData: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    
    // Redirect based on role
    if (userData.role === 'admin') {
      router.push("/dashboard");
    } else {
      router.push("/");
    }
  };

  const updateUser = (userData: User) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isUser = () => {
    return user?.role === 'user';
  };

  return {
    user: isClient ? user : null,
    isLoading,
    isAuthenticated: isClient ? isAuthenticated : false,
    logout,
    login,
    updateUser,
    isAdmin,
    isUser
  };
};