import axios from "axios";

// For server-side rendering, we need the full URL
// For client-side, we can use relative URLs or the public URL
const getBaseURL = () => {
  // Server-side: use the internal service URL or fallback to localhost
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  }
  // Client-side: use the public API URL
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
};

const API_URL = getBaseURL();

// Single axios instance - all requests go through API Gateway on port 5000
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased to 30 seconds for registration/email operations
  withCredentials: true, // Important: Send cookies with requests
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Cookies are automatically sent with withCredentials: true
    // But we still support Authorization header for backward compatibility
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
 
// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Silent handling - no console logs
      
      // Only access localStorage on client-side
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("fcm_token"); // ✅ Clear FCM token on auth failure

        // Don't redirect during logout process - let the logout function handle navigation
        const isLogoutRequest = error.config?.url?.includes("/logout");
        if (!isLogoutRequest) {
          // Use a custom event to notify components about auth failure
          window.dispatchEvent(
            new CustomEvent("auth-failure", {
              detail: { reason: "unauthorized" },
            })
          );
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
