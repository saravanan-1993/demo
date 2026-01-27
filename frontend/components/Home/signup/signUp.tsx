"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuthContext } from "@/components/providers/auth-provider";
import { requestNotificationPermission } from "@/lib/firebase";

export const SignUp = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  
  // Get admin's country or default to empty string
  const adminCountry = user?.role === "admin" && user?.country ? user.country : "";
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
    };

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else {
      // Basic validation - PhoneInput component handles country-specific validation
      const digitsOnly = formData.phoneNumber.replace(/\D/g, "");
      if (digitsOnly.length < 7 || digitsOnly.length > 20) {
        newErrors.phoneNumber = "Please enter a valid phone number";
      }
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password =
        "Password must contain uppercase, lowercase, and number";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      setIsLoading(true);

      try {
        // Get FCM token
        let fcmToken = null;
        try {
          fcmToken = await requestNotificationPermission();
          if (fcmToken) {
            console.log('📱 FCM token generated for registration:', fcmToken);
          }
        } catch (fcmError) {
          console.log('⚠️ FCM token generation failed:', fcmError);
          // Continue with registration even if FCM fails
        }

        const response = await axiosInstance.post('/api/auth/register', {
          email: formData.email,
          password: formData.password,
          name: formData.fullName,
          phoneNumber: formData.phoneNumber,
          fcmToken, // Send FCM token with registration
        });

        if (response.data.success) {
          toast.success('Registration successful! Please check your email to verify your account.');
          router.replace('/signin');
        } else {
          const errorMsg = response.data.error || 'Registration failed';
          
          if (errorMsg.includes('already exists')) {
            toast.error(errorMsg);
            setErrors(prev => ({
              ...prev,
              email: errorMsg
            }));
          } else {
            setErrors(prev => ({
              ...prev,
              email: errorMsg
            }));
          }
        }
      } catch (error: unknown) {
        const errorMessage =
          (error as { response?: { data?: { error?: string } } })?.response
            ?.data?.error || "Network error. Please try again.";

        if (errorMessage.includes('already exists')) {
          toast.error(errorMessage);
          setErrors(prev => ({
            ...prev,
            email: errorMessage
          }));
        } else {
          setErrors(prev => ({
            ...prev,
            email: errorMessage
          }));
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);

    try {
      // Get FCM token before redirecting
      let fcmToken = null;
      try {
        fcmToken = await requestNotificationPermission();
        if (fcmToken) {
          // Store FCM token in sessionStorage to send after Google OAuth callback
          sessionStorage.setItem('pendingFcmToken', fcmToken);
          console.log('📱 FCM token stored for Google OAuth signup');
        }
      } catch (fcmError) {
        console.log('⚠️ FCM token generation failed:', fcmError);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      window.location.href = `${apiUrl}/api/auth/google`;
    } catch {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg p-4 sm:p-8 shadow-sm">
          {/* Logo and Title */}
          <div className="text-center mb-4 sm:mb-6">
            <Image 
              src="/logo.jpeg" 
              alt="LEATS" 
              width={100} 
              height={40} 
              sizes="100px"
              className="mx-auto mb-3 sm:mb-4 w-16 sm:w-[100px]"
              priority
              quality={90}
            />
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">Create Account</h1>
            <p className="text-gray-500 text-xs sm:text-sm">Join LEATS for fresh groceries</p>
          </div>

          {/* Google Sign Up Button */}
          <button
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading || isLoading}
            className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {isGoogleLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span className="text-gray-700 font-medium">Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E63946] text-sm"
                placeholder="Enter your name"
                disabled={isLoading || isGoogleLoading}
                required
              />
              {errors.fullName && (
                <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E63946] text-sm"
                placeholder="Enter email"
                disabled={isLoading || isGoogleLoading}
                required
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <PhoneInput
                id="phoneNumber"
                country={adminCountry}
                value={formData.phoneNumber}
                onChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    phoneNumber: value,
                  }));
                  // Clear error when user starts typing
                  if (errors.phoneNumber) {
                    setErrors((prev) => ({
                      ...prev,
                      phoneNumber: "",
                    }));
                  }
                }}
                disabled={isLoading || isGoogleLoading}
                className="text-sm"
              />
              {errors.phoneNumber && (
                <p className="text-xs text-red-600 mt-1">{errors.phoneNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E63946] text-sm"
                  placeholder="Create password"
                  disabled={isLoading || isGoogleLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <IconEyeOff size={20} />
                  ) : (
                    <IconEye size={20} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 mt-1">{errors.password}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Must contain uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E63946] text-sm"
                  placeholder="Confirm password"
                  disabled={isLoading || isGoogleLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <IconEyeOff size={20} />
                  ) : (
                    <IconEye size={20} />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isLoading || isGoogleLoading}
              className="w-full bg-[#E63946] text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-[#C62E39] text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Terms and Privacy */}
          <p className="text-xs text-center text-gray-500 mt-4">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-[#E63946] hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[#E63946] hover:underline">
              Privacy Policy
            </Link>
          </p>

          {/* Sign In Link */}
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-gray-600 text-xs sm:text-sm">
              Already have an account?{" "}
              <Link href="/signin" className="text-[#E63946] font-medium hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

