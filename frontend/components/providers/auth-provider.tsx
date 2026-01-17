"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/types/auth";
import axiosInstance from "@/lib/axios";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userData: User) => void;
  logout: () => Promise<void>;
  updateUser: (userData: User) => void;
  refreshUserData: () => Promise<unknown>;
  isAdmin: () => boolean;
  isUser: () => boolean;
  getCompanyName: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (!token || !userData) {
          setIsLoading(false);
          return;
        }

        // Validate token expiry
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const currentTime = Date.now() / 1000;

          if (payload.exp <= currentTime) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            sessionStorage.removeItem("sessionOnly");
            setIsLoading(false);
            return;
          }
        } catch (tokenError) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          sessionStorage.removeItem("sessionOnly");
          setIsLoading(false);
          return;
        }

        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
          
          // Auto-refresh user data if country is missing (for existing logged-in users)
          if (parsedUser.role === "admin" && !parsedUser.country) {
            console.log("🔄 Country data missing, refreshing user data...");
            try {
              const response = await axiosInstance.get("/api/auth/admin/me");
              if (response.data.success) {
                const freshUserData = {
                  ...response.data.data,
                  role: "admin"
                };
                localStorage.setItem("user", JSON.stringify(freshUserData));
                setUser(freshUserData);
                console.log("✅ User data refreshed with country:", freshUserData.country);
              }
            } catch (refreshError) {
              console.error("Failed to refresh user data:", refreshError);
            }
          }
        } catch (parseError) {
          console.error("Error parsing user data:", parseError);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          sessionStorage.removeItem("sessionOnly");
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Listen for auth state changes across components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "user") {
        // Re-check auth when storage changes
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        
        if (!token || !userData) {
          setUser(null);
          setIsAuthenticated(false);
        } else {
          try {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setIsAuthenticated(true);
          } catch (error) {
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      }
    };

    const handleAuthRefresh = () => {
      console.log('🔄 AuthProvider: Auth refresh event received');
      // Force re-check auth state
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      
      console.log('🔍 AuthProvider: Token exists:', !!token, 'User data exists:', !!userData);
      
      if (!token || !userData) {
        setUser(null);
        setIsAuthenticated(false);
      } else {
        try {
          const parsedUser = JSON.parse(userData);
          console.log('✅ AuthProvider: Setting user:', parsedUser.name);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('❌ AuthProvider: Error parsing user data:', error);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('auth-refresh', handleAuthRefresh);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('auth-refresh', handleAuthRefresh);
      }
    };
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    
    // Trigger auth refresh event for other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-refresh'));
    }
    
    // Track login event for analytics
    if (typeof window !== 'undefined') {
      console.log('📊 User login detected, will track analytics for user:', userData.id);
    }
  };

  const logout = async () => {
    try {
      await axiosInstance.post("/api/auth/logout");
      
      // Track logout event for analytics
      if (typeof window !== 'undefined' && user) {
        console.log('📊 User logout detected, will track analytics for user:', user.id);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("sessionOnly");
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (userData: User) => {
    console.log("Updating user data:", userData);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const refreshUserData = async () => {
    try {
      if (user?.role === "admin") {
        const response = await axiosInstance.get("/api/auth/admin/me");
        if (response.data.success) {
          console.log("Refreshed user data:", response.data.data);
          updateUser(response.data.data);
          return response.data.data;
        }
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
    return null;
  };

  const isAdmin = () => {
    return user?.role === "admin";
  };

  const isUser = () => {
    return user?.role === "user";
  };

  const getCompanyName = (): string => {
    // Check if user exists and has company name
    if (user?.companyName?.trim()) {
      return user.companyName.trim();
    }
    
    // Return empty string to let company provider handle fallback
    return "";
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    refreshUserData,
    isAdmin,
    isUser,
    getCompanyName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};