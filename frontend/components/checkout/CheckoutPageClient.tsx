"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuthContext } from '@/components/providers/auth-provider';
import { IconMapPin, IconCreditCard, IconPackage, IconCheck, IconChevronRight, IconPlus, IconEdit, IconLoader2, IconAlertCircle , IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import axiosInstance from '@/lib/axios';
import * as addressService from '@/services/online-services/addressService';
import type { Address, CreateAddressRequest } from '@/services/online-services/addressService';
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneInput } from "@/components/ui/phone-input";
import { CountryStateCitySelect } from "@/components/ui/country-state-city-select";
import { useCurrency } from "@/hooks/useCurrency";
import { ZipCodeInput } from "@/components/ui/zipcode-input";

// Session storage keys for checkout state persistence
const CHECKOUT_STORAGE_KEYS = {
  SELECTED_ADDRESS_ID: 'checkout_selected_address_id',
  SELECTED_PAYMENT_METHOD: 'checkout_selected_payment_method',
  APPLIED_COUPON: 'checkout_applied_coupon',
} as const;

// Razorpay types
interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayResponse) => void;
  modal: {
    ondismiss: () => void;
  };
  theme: {
    color: string;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

type CheckoutStep = "address" | "payment" | "review";

export default function CheckoutPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, totalPrice, totalSavings, totalItems, isInitialized, clearCart } =
    useCart();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthContext();
  const currencySymbol = useCurrency();
  
  // Get step from URL, default to 'address'
  const stepFromUrl = searchParams.get('step') as CheckoutStep | null;
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("address");
  const [isStepInitialized, setIsStepInitialized] = useState(false);
  
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isCODAvailable, setIsCODAvailable] = useState(true);
  const [codUnavailableProducts, setCodUnavailableProducts] = useState<string[]>([]);
  const [showCODModal, setShowCODModal] = useState(false);
  const [activePaymentGateways, setActivePaymentGateways] = useState<string[]>([]);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState<Array<{
    id: string;
    code: string;
    description: string;
    discountType: string;
    discountValue: number;
    usageType: string;
    minOrderValue: number | null;
    maxDiscountAmount: number | null;
    estimatedDiscount: number;
    isFirstTimeUserOnly: boolean;
  }>>([]);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [showAvailableCoupons, setShowAvailableCoupons] = useState(false);

  // Helper function to update URL with step
  const updateUrlWithStep = useCallback((step: CheckoutStep) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', step);
    router.replace(`/checkout?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Helper function to save checkout state to sessionStorage
  const saveCheckoutState = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    if (selectedAddress?.id) {
      sessionStorage.setItem(CHECKOUT_STORAGE_KEYS.SELECTED_ADDRESS_ID, selectedAddress.id);
    }
    if (selectedPaymentMethod) {
      sessionStorage.setItem(CHECKOUT_STORAGE_KEYS.SELECTED_PAYMENT_METHOD, selectedPaymentMethod);
    }
    if (appliedCoupon) {
      sessionStorage.setItem(CHECKOUT_STORAGE_KEYS.APPLIED_COUPON, JSON.stringify(appliedCoupon));
    }
  }, [selectedAddress?.id, selectedPaymentMethod, appliedCoupon]);

  // Helper function to restore checkout state from sessionStorage
  const restoreCheckoutState = useCallback((loadedAddresses: Address[]) => {
    if (typeof window === 'undefined') return;
    
    // Restore selected address
    const savedAddressId = sessionStorage.getItem(CHECKOUT_STORAGE_KEYS.SELECTED_ADDRESS_ID);
    if (savedAddressId && loadedAddresses.length > 0) {
      const savedAddress = loadedAddresses.find(a => a.id === savedAddressId);
      if (savedAddress) {
        setSelectedAddress(savedAddress);
      }
    }
    
    // Restore payment method
    const savedPaymentMethod = sessionStorage.getItem(CHECKOUT_STORAGE_KEYS.SELECTED_PAYMENT_METHOD);
    if (savedPaymentMethod) {
      setSelectedPaymentMethod(savedPaymentMethod);
    }
    
    // Restore applied coupon
    const savedCoupon = sessionStorage.getItem(CHECKOUT_STORAGE_KEYS.APPLIED_COUPON);
    if (savedCoupon) {
      try {
        setAppliedCoupon(JSON.parse(savedCoupon));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Clear checkout state from sessionStorage
  const clearCheckoutState = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEYS.SELECTED_ADDRESS_ID);
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEYS.SELECTED_PAYMENT_METHOD);
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEYS.APPLIED_COUPON);
  }, []);

  // Initialize step from URL on mount
  useEffect(() => {
    if (isStepInitialized) return;
    
    const validSteps: CheckoutStep[] = ['address', 'review', 'payment'];
    
    if (stepFromUrl && validSteps.includes(stepFromUrl)) {
      // Will validate access after addresses are loaded
      setCurrentStep(stepFromUrl);
    } else {
      // No step in URL or invalid step, set to address and update URL
      setCurrentStep('address');
      updateUrlWithStep('address');
    }
    
    setIsStepInitialized(true);
  }, [stepFromUrl, isStepInitialized, updateUrlWithStep]);

  // Save checkout state whenever it changes
  useEffect(() => {
    saveCheckoutState();
  }, [saveCheckoutState]);

  // Check if user is authenticated and cart is not empty
  useEffect(() => {
    if (authLoading || !isInitialized) return;

    if (!isAuthenticated || !user?.id) {
      if (!isAuthenticated) {
        toast.error("Please login to continue");
        router.push("/signin?redirect=/checkout");
      }
      return;
    }

    if (items.length === 0) {
      // Don't show toast - just redirect silently (cart was likely just cleared after order)
      router.push("/cart");
      return;
    }

    loadAddresses();
    checkCODAvailability();
    fetchAvailableCoupons();
    fetchActivePaymentGateways();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, items.length, router, authLoading, isInitialized]);

  const loadAddresses = async () => {
    if (!user?.id) return;

    try {
      setIsLoadingAddresses(true);
      
      // Fetch saved addresses and user profile in parallel
      const [addressResponse, userResponse] = await Promise.all([
        addressService.getAddresses(user.id),
        axiosInstance.get('/api/auth/me')
      ]);
      
      let allAddresses = [...addressResponse.data];
      
      // Add user profile address if it has complete address information
      if (userResponse.data.success && userResponse.data.data) {
        const userData = userResponse.data.data;
        
        // Check if user has complete address information
        if (userData.address && userData.city && userData.state && userData.zipCode && userData.country) {
          const profileAddress: Address = {
            id: 'profile-address',
            customerId: 'profile', // Placeholder for profile address
            name: userData.name,
            phone: userData.phoneNumber || '',
            alternatePhone: '',
            addressLine1: userData.address,
            addressLine2: '',
            landmark: '',
            city: userData.city,
            state: userData.state,
            pincode: userData.zipCode,
            country: userData.country,
            addressType: 'home',
            isDefault: false,
            createdAt: userData.createdAt || new Date().toISOString(),
            updatedAt: userData.updatedAt || new Date().toISOString(),
          };
          
          // Check if this address already exists in saved addresses
          const isDuplicate = addressResponse.data.some(addr => 
            addr.addressLine1.toLowerCase().trim() === userData.address.toLowerCase().trim() &&
            addr.city.toLowerCase().trim() === userData.city.toLowerCase().trim() &&
            addr.pincode === userData.zipCode
          );
          
          // Only add if it's not a duplicate
          if (!isDuplicate) {
            allAddresses.unshift(profileAddress); // Add at the beginning
          }
        }
      }
      
      setAddresses(allAddresses);
      
      // Restore checkout state from sessionStorage
      restoreCheckoutState(allAddresses);
      
      // If no address was restored from session, auto-select default or first
      const savedAddressId = sessionStorage.getItem(CHECKOUT_STORAGE_KEYS.SELECTED_ADDRESS_ID);
      if (!savedAddressId) {
        const defaultAddr =
          allAddresses.find((a) => a.isDefault) || allAddresses[0];
        if (defaultAddr) {
          setSelectedAddress(defaultAddr);
        }
      }
      
      // Validate step access after addresses are loaded
      // If user is on review/payment but has no address, redirect to address step
      if (allAddresses.length === 0 && (currentStep === 'review' || currentStep === 'payment')) {
        setCurrentStep('address');
        updateUrlWithStep('address');
        toast.info('Please add a delivery address first');
      } else if (currentStep !== 'address') {
        // Validate that saved address still exists
        const savedAddress = savedAddressId 
          ? allAddresses.find(a => a.id === savedAddressId)
          : allAddresses.find(a => a.isDefault) || allAddresses[0];
          
        if (!savedAddress) {
          setCurrentStep('address');
          updateUrlWithStep('address');
          toast.info('Please select a delivery address');
        } else {
          setSelectedAddress(savedAddress);
        }
      }
    } catch (error) {
      console.error("Error loading addresses:", error);
      toast.error("Failed to load addresses");
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const checkCODAvailability = async () => {
    if (!user?.id) return;
    
    // Don't check COD availability if cart is empty
    if (items.length === 0) {
      setIsCODAvailable(true);
      return;
    }
    
    try {
      const response = await axiosInstance.get(
        '/api/online/orders/check-cod-availability',
        { params: { userId: user.id } }
      );
      
      if (response.data.success) {
        setIsCODAvailable(response.data.isCODAvailable);
        if (!response.data.isCODAvailable && response.data.unavailableProducts) {
          setCodUnavailableProducts(response.data.unavailableProducts);
        }
      }
    } catch (error) {
      console.error('Error checking COD availability:', error);
      // Default to COD available on error
      setIsCODAvailable(true);
    }
  };

  const fetchAvailableCoupons = async () => {
    if (!user?.id || totalPrice <= 0) return;

    try {
      console.log('Fetching available coupons for:', { userId: user.id, orderValue: totalPrice });
      const response = await axiosInstance.get('/api/online/coupons/available', {
        params: {
          userId: user.id,
          orderValue: totalPrice,
        },
      });

      console.log('Available coupons response:', response.data);

      if (response.data.success) {
        setAvailableCoupons(response.data.data.coupons);
        setIsFirstTimeUser(response.data.data.isFirstTimeUser);
        console.log('Set available coupons:', response.data.data.coupons.length, 'coupons');
        console.log('Is first time user:', response.data.data.isFirstTimeUser);
      }
    } catch (error) {
      console.error('Error fetching available coupons:', error);
    }
  };

  const fetchActivePaymentGateways = async () => {
    try {
      const response = await axiosInstance.get('/api/payment-gateway/active');
      
      if (response.data.success) {
        const activeGatewayNames = response.data.data.map((g: { name: string }) => g.name);
        setActivePaymentGateways(activeGatewayNames);
        console.log('Active payment gateways:', activeGatewayNames);
      }
    } catch (error) {
      console.error('Error fetching active payment gateways:', error);
      // Default to empty array on error
      setActivePaymentGateways([]);
    }
  };

  // Apply coupon from available coupons list (direct apply - no input fill)
  const handleApplyCouponFromList = async (code: string) => {
    if (!user?.id) {
      toast.error('Please login to apply coupon');
      return;
    }

    try {
      setIsValidatingCoupon(true);

      // Get unique category IDs from cart items
      const categoryIds: string[] = Array.from(
        new Set(items.map(item => item.categoryId).filter(Boolean))
      );

      const requestData = {
        code: code.toUpperCase(),
        userId: user.id,
        orderValue: totalPrice,
        categories: categoryIds,
      };

      console.log('🎫 Applying coupon from list:', requestData);

      const response = await axiosInstance.post(
        '/api/online/coupons/validate',
        requestData
      );

      if (response.data.success) {
        setAppliedCoupon({
          code: response.data.data.code,
          discountAmount: response.data.data.discountAmount,
        });
        setShowAvailableCoupons(false);
        toast.success(`Coupon applied! You saved ${currencySymbol}${response.data.data.discountAmount.toFixed(2)}`);
      } else {
        toast.error(response.data.message || 'Invalid coupon code');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to apply coupon');
      }
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Apply coupon from manual input
  const handleApplyCoupon = async (code?: string) => {
    const couponToApply = code || couponCode;
    
    if (!couponToApply.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    if (!user?.id) {
      setCouponError('Please login to apply coupon');
      return;
    }

    try {
      setIsValidatingCoupon(true);
      setCouponError('');

      // Get unique category IDs from cart items
      const categoryIds: string[] = Array.from(
        new Set(items.map(item => item.categoryId).filter(Boolean))
      );

      const requestData = {
        code: couponToApply.toUpperCase(),
        userId: user.id,
        orderValue: totalPrice,
        categories: categoryIds, // Send category IDs
      };

      console.log('🎫 Applying coupon with data:', requestData);

      const response = await axiosInstance.post(
        '/api/online/coupons/validate',
        requestData
      );

      if (response.data.success) {
        setAppliedCoupon({
          code: response.data.data.code,
          discountAmount: response.data.data.discountAmount,
        });
        setShowAvailableCoupons(false);
        toast.success(`Coupon applied! You saved ${currencySymbol}${response.data.data.discountAmount.toFixed(2)}`);
      } else {
        setCouponError(response.data.message || 'Invalid coupon code');
        toast.error(response.data.message || 'Invalid coupon code');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        setCouponError(error.response.data.message);
        toast.error(error.response.data.message);
      } else {
        setCouponError('Failed to apply coupon');
        toast.error('Failed to apply coupon');
      }
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    // Clear coupon from sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CHECKOUT_STORAGE_KEYS.APPLIED_COUPON);
    }
    toast.success('Coupon removed');
  };

  const handleSaveAddress = async (addressData: AddressFormData) => {
    if (!user?.id) return;

    // Add userId to the address data
    const addressWithUserId: CreateAddressRequest = {
      ...addressData,
      userId: user.id,
    };

    try {
      if (editingAddress) {
        // Update existing address
        const response = await addressService.updateAddress(
          user.id,
          editingAddress.id,
          addressWithUserId
        );
        setAddresses((prev) =>
          prev.map((a) => (a.id === editingAddress.id ? response.data : a))
        );
        if (selectedAddress?.id === editingAddress.id) {
          setSelectedAddress(response.data);
        }
        toast.success("Address updated successfully");
      } else {
        // Create new address
        const response = await addressService.createAddress(
          user.id,
          addressWithUserId
        );
        setAddresses((prev) => {
          // If new address is default, update others
          if (response.data.isDefault) {
            return [
              ...prev.map((a) => ({ ...a, isDefault: false })),
              response.data,
            ];
          }
          return [...prev, response.data];
        });
        setSelectedAddress(response.data);
        toast.success("Address added successfully");
      }
      setShowAddressForm(false);
      setEditingAddress(null);
    } catch (error: unknown) {
      console.error("Error saving address:", error);

      // Handle specific error cases
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: {
            status?: number;
            data?: { error?: string; code?: string };
          };
        };

        // Handle 404 Customer not found error
        if (
          axiosError.response?.status === 404 &&
          axiosError.response?.data?.error?.includes("Customer not found")
        ) {
          toast.error(
            "Account setup in progress. Please refresh the page and try again.",
            {
              duration: 4000,
            }
          );
          return;
        }

        // Handle address limit reached error
        if (
          axiosError.response?.status === 400 &&
          axiosError.response?.data?.code === "ADDRESS_LIMIT_REACHED"
        ) {
          toast.error(
            axiosError.response.data.error ||
              "Maximum 5 addresses allowed. Please edit an existing address instead.",
            {
              duration: 5000,
            }
          );
          setShowAddressForm(false);
          return;
        }

        // Handle other errors
        const errorMessage =
          axiosError.response?.data?.error || "Failed to save address";
        toast.error(errorMessage);
      } else {
        toast.error("Failed to save address");
      }
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user?.id) return;

    try {
      await addressService.setDefaultAddress(user.id, addressId);
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === addressId,
        }))
      );
      toast.success("Default address updated");
    } catch {
      toast.error("Failed to set default address");
    }
  };

  const deliveryFee = totalPrice >= 499 ? 0 : 40;
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const total = totalPrice - couponDiscount + deliveryFee;

  const steps = [
    { id: "address", label: "Delivery Address", icon: IconMapPin },
    { id: "review", label: "Review Order", icon: IconPackage },
    { id: "payment", label: "Payment Method", icon: IconCreditCard },
  ];

  const handleContinue = () => {
    if (currentStep === "address") {
      if (!selectedAddress) {
        toast.error("Please select a delivery address");
        return;
      }
      setCurrentStep("review");
      updateUrlWithStep("review");
    } else if (currentStep === "review") {
      setCurrentStep("payment");
      updateUrlWithStep("payment");
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress || !selectedPaymentMethod) {
      toast.error('Please complete all steps');
      return;
    }

    setIsPlacingOrder(true);
    try {
      // Call the order API
      const response = await axiosInstance.post('/api/online/orders', {
        userId: user?.id,
        deliveryAddressId: selectedAddress.id,
        paymentMethod: selectedPaymentMethod === 'online' ? 'razorpay' : 'cod',
        couponCode: appliedCoupon?.code || null,
      });

      const data = response.data;

      console.log('Order API Response:', data);

      if (!data.success) {
        // Handle specific Razorpay configuration error
        if (data.error && data.error.includes('razorpay payment gateway is not configured')) {
          toast.error('Online payment is currently unavailable. Please try Cash on Delivery or contact support.');
          setIsPlacingOrder(false);
          return;
        }
        throw new Error(data.error || 'Failed to place order');
      }

      // Check if payment is required (Razorpay)
      if (data.requiresPayment && data.data.razorpay) {
        console.log('Opening Razorpay checkout with:', data.data.razorpay);
        // Load Razorpay script if not already loaded
        if (!window.Razorpay) {
          console.log('Loading Razorpay script...');
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          document.body.appendChild(script);
          await new Promise((resolve, reject) => {
            script.onload = () => {
              console.log('Razorpay script loaded successfully');
              resolve(true);
            };
            script.onerror = () => {
              console.error('Failed to load Razorpay script');
              reject(new Error('Failed to load Razorpay script'));
            };
          });
        } else {
          console.log('Razorpay script already loaded');
        }

        // Open Razorpay checkout
        const options: RazorpayOptions = {
          key: data.data.razorpay.keyId,
          amount: data.data.razorpay.amount,
          currency: data.data.razorpay.currency,
          order_id: data.data.razorpay.orderId,
          name: 'Leats',
          description: `Order ${data.data.orderNumber}`,
          handler: async (razorpayResponse: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            console.log('Payment successful, verifying...', razorpayResponse);
            try {
              // Verify payment
              const verifyResponse = await axiosInstance.post('/api/payment-gateway/verify', {
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
              });

              const verifyData = verifyResponse.data;

              if (!verifyData.success) {
                throw new Error('Payment verification failed');
              }

              // Confirm order after payment
              const confirmResponse = await axiosInstance.post('/api/online/orders/confirm', {
                userId: user?.id,
                deliveryAddressId: selectedAddress.id,
                paymentMethod: 'razorpay',
                couponCode: appliedCoupon?.code || null,
                orderNumber: data.data.orderNumber,
                paymentId: razorpayResponse.razorpay_payment_id,
                razorpayOrderId: razorpayResponse.razorpay_order_id,
              });

              const confirmData = confirmResponse.data;

              if (!confirmData.success) {
                throw new Error('Failed to confirm order');
              }

              // Clear checkout state and cart on successful order
              clearCheckoutState();
              await clearCart();
              toast.success('Order placed successfully!');
              router.push(`/my-orders/${confirmData.data.orderNumber}`);
            } catch (error) {
              console.error('Payment confirmation error:', error);
              const errorMessage = error instanceof Error ? error.message : 'Payment verification failed';
              toast.error(errorMessage);
            } finally {
              setIsPlacingOrder(false);
            }
          },
          modal: {
            ondismiss: () => {
              console.log('Payment modal dismissed by user');
              toast.error('Payment cancelled');
              setIsPlacingOrder(false);
            },
          },
          theme: {
            color: '#e63946',
          },
        };

        console.log('Creating Razorpay instance with options:', options);
        if (window.Razorpay) {
          const razorpay = new window.Razorpay(options);
          console.log('Opening Razorpay modal...');
          razorpay.open();
        }
      } else {
        // COD order - already created
        console.log('COD order created:', data.data);
        // Clear checkout state and cart on successful order
        clearCheckoutState();
        await clearCart();
        toast.success('Order placed successfully!');
        router.push(`/my-orders/${data.data.orderNumber}`);
        setIsPlacingOrder(false);
      }
    } catch (error) {
      // Handle specific Razorpay configuration error without console logging
      if (error instanceof Error && error.message.includes('razorpay payment gateway is not configured')) {
        toast.error('Online payment is currently unavailable. Please try Cash on Delivery or contact support.');
        setIsPlacingOrder(false);
        return;
      }
      
      // Handle other payment gateway configuration errors
      if (error instanceof Error && error.message.includes('payment gateway is not configured')) {
        toast.error('Payment service is currently unavailable. Please try Cash on Delivery or contact support.');
        setIsPlacingOrder(false);
        return;
      }
      
      // Log other errors to console for debugging
      console.error('Order placement error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to place order';
      toast.error(errorMessage);
      setIsPlacingOrder(false);
    }
  };

  const paymentMethods = [
    { id: 'cod', name: 'Cash on Delivery', description: 'Pay when you receive', icon: '💵' },
    { id: 'online', name: 'Pay Now', description: 'Secure online payment', icon: '💳' },
  ].filter(method => {
    // Filter based on active payment gateways from backend
    if (method.id === 'cod') {
      return activePaymentGateways.includes('cod');
    }
    if (method.id === 'online') {
      // Show online payment if either Razorpay or Stripe is active
      return activePaymentGateways.includes('razorpay') || activePaymentGateways.includes('stripe');
    }
    return false;
  });

  // Format phone number for display
  const formatPhone = (phone: string) => {
    if (phone.length === 10) {
      return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
    }
    return phone;
  };

  if (authLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-4 py-8">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 mb-8">
            <Skeleton className="h-4 w-12 bg-gray-200" />
            <span className="text-gray-300">/</span>
            <Skeleton className="h-4 w-12 bg-gray-200" />
            <span className="text-gray-300">/</span>
            <Skeleton className="h-4 w-24 bg-gray-200" />
          </div>

          {/* Progress Steps Skeleton */}
          <div className="mb-8">
            <div className="flex items-center justify-center">
              {[1, 2, 3].map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <Skeleton className="w-12 h-12 rounded-full bg-gray-200" />
                    <Skeleton className="h-4 w-24 mt-2 bg-gray-200" />
                  </div>
                  {index < 2 && <div className="w-24 h-1 mx-4 bg-gray-200" />}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Skeleton */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <Skeleton className="h-6 w-48 bg-gray-200" />
                  <Skeleton className="h-6 w-32 bg-gray-200" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full rounded-lg bg-gray-200" />
                  <Skeleton className="h-32 w-full rounded-lg bg-gray-200" />
                  <Skeleton className="h-12 w-full rounded-md mt-6 bg-gray-200" />
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24 space-y-4">
                <Skeleton className="h-6 w-32 mb-4 bg-gray-200" />
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24 bg-gray-200" />
                    <Skeleton className="h-4 w-16 bg-gray-200" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24 bg-gray-200" />
                    <Skeleton className="h-4 w-16 bg-gray-200" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24 bg-gray-200" />
                    <Skeleton className="h-4 w-16 bg-gray-200" />
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-16 bg-gray-200" />
                    <Skeleton className="h-6 w-24 bg-gray-200" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full rounded-md mt-2 bg-gray-200" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-4 sm:mb-8">
          <Link href="/" className="hover:text-[#e63946]">
            Home
          </Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-[#e63946]">
            Cart
          </Link>
          <span>/</span>
          <span className="text-gray-900">Checkout</span>
        </nav>

        {/* Progress Steps - Mobile Optimized */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between sm:justify-center">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted =
                steps.findIndex((s) => s.id === currentStep) > index;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? "bg-green-600"
                          : isActive
                          ? "bg-[#e63946]"
                          : "bg-gray-300"
                      } text-white transition-colors`}
                    >
                      {isCompleted ? (
                        <IconCheck size={20} className="sm:w-6 sm:h-6" />
                      ) : (
                        <Icon size={20} className="sm:w-6 sm:h-6" />
                      )}
                    </div>
                    <span
                      className={`mt-1.5 sm:mt-2 text-[10px] sm:text-sm font-medium text-center max-w-[70px] sm:max-w-none ${
                        isActive
                          ? "text-[#e63946]"
                          : isCompleted
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-8 sm:w-24 h-0.5 sm:h-1 mx-1 sm:mx-4 ${
                        isCompleted ? "bg-green-600" : "bg-gray-300"
                      } transition-colors`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Address Step */}
            {currentStep === "address" && (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                    Select Delivery Address
                  </h2>
                  {addresses.length < 5 && (
                    <button
                      onClick={() => {
                        setEditingAddress(null);
                        setShowAddressForm(true);
                      }}
                      className="flex items-center gap-2 text-[#e63946] hover:text-[#c1121f] font-medium text-sm sm:text-base"
                    >
                      <IconPlus size={18} className="sm:w-5 sm:h-5" />
                      Add New Address
                    </button>
                  )}
                  {addresses.length >= 5 && (
                    <div className="text-xs sm:text-sm text-gray-500">
                      {addresses.length}/5 addresses
                    </div>
                  )}
                </div>

                {showAddressForm ? (
                  <AddressForm
                    initialData={editingAddress}
                    onCancel={() => {
                      setShowAddressForm(false);
                      setEditingAddress(null);
                    }}
                    onSave={handleSaveAddress}
                  />
                ) : isLoadingAddresses ? (
                  <div className="space-y-4">
                    <Skeleton className="h-[140px] w-full rounded-lg bg-gray-200" />
                    <Skeleton className="h-[140px] w-full rounded-lg bg-gray-200" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-12">
                    <IconMapPin
                      size={48}
                      className="mx-auto text-gray-300 mb-4"
                    />
                    <p className="text-gray-600 mb-4">
                      No saved addresses found
                    </p>
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="text-[#e63946] hover:text-[#c1121f] font-medium"
                    >
                      Add your first address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        onClick={() => setSelectedAddress(address)}
                        className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
                          selectedAddress?.id === address.id
                            ? "border-[#e63946] bg-red-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                              <span className="font-semibold text-gray-900 text-sm sm:text-base">
                                {address.name}
                              </span>
                              <span className="px-1.5 sm:px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] sm:text-xs rounded uppercase">
                                {address.addressType}
                              </span>
                              {address.isDefault && (
                                <span className="px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-700 text-[10px] sm:text-xs rounded">
                                  DEFAULT
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 text-sm sm:text-base mb-0.5 sm:mb-1">
                              {address.addressLine1}
                            </p>
                            {address.addressLine2 && (
                              <p className="text-gray-700 text-sm sm:text-base mb-0.5 sm:mb-1">
                                {address.addressLine2}
                              </p>
                            )}
                            {address.landmark && (
                              <p className="text-gray-600 text-xs sm:text-sm mb-0.5 sm:mb-1">
                                Landmark: {address.landmark}
                              </p>
                            )}
                            <p className="text-gray-700 text-sm sm:text-base mb-1.5 sm:mb-2">
                              {address.city}, {address.state} -{" "}
                              {address.pincode}
                            </p>
                            <p className="text-gray-600 text-xs sm:text-sm">
                              Phone: {formatPhone(address.phone)}
                            </p>
                            {address.alternatePhone && (
                              <p className="text-gray-600 text-xs sm:text-sm">
                                Alt: {formatPhone(address.alternatePhone)}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAddress(address);
                                setShowAddressForm(true);
                              }}
                              className="p-1.5 sm:p-2 text-gray-600 hover:text-[#e63946]"
                              title="Edit address"
                            >
                              <IconEdit size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                          </div>
                        </div>
                        {!address.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetDefault(address.id);
                            }}
                            className="mt-3 text-sm text-[#e63946] hover:text-[#c1121f] font-medium"
                          >
                            Set as default
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!showAddressForm && addresses.length > 0 && (
                  <button
                    onClick={handleContinue}
                    disabled={!selectedAddress}
                    className="w-full mt-6 bg-[#e63946] text-white py-3 rounded-md hover:bg-[#c1121f] transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Continue to Review
                    <IconChevronRight size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Review Step (Now Step 2) */}
            {currentStep === "review" && (
              <div className="space-y-4 sm:space-y-6">
                {/* Delivery Address Summary */}
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                      Delivering To
                    </h3>
                    <button
                      onClick={() => {
                        setCurrentStep("address");
                        updateUrlWithStep("address");
                      }}
                      className="text-[#e63946] hover:text-[#c1121f] font-medium text-xs sm:text-sm"
                    >
                      Change
                    </button>
                  </div>
                  {selectedAddress && (
                    <div className="text-sm sm:text-base">
                      <p className="font-semibold text-gray-900">
                        {selectedAddress.name}
                      </p>
                      <p className="text-gray-700">
                        {selectedAddress.addressLine1}
                      </p>
                      {selectedAddress.addressLine2 && (
                        <p className="text-gray-700">
                          {selectedAddress.addressLine2}
                        </p>
                      )}
                      <p className="text-gray-700">
                        {selectedAddress.city}, {selectedAddress.state} -{" "}
                        {selectedAddress.pincode}
                      </p>
                      <p className="text-gray-600 mt-1 text-xs sm:text-sm">
                        Phone: {formatPhone(selectedAddress.phone)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                    Order Items ({totalItems} items)
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    {items.map((item) => (
                      <div
                        key={`${item.productId}-${item.inventoryProductId}`}
                        className="flex gap-3 sm:gap-4"
                      >
                        <Image
                          src={item.variantImage || "/placeholder-product.png"}
                          alt={item.shortDescription}
                          width={60}
                          height={60}
                          className="rounded-lg object-contain bg-gray-50 w-14 h-14 sm:w-[60px] sm:h-[60px]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] sm:text-xs text-gray-500">{item.brand}</p>
                          <h4 className="font-medium text-gray-900 text-xs sm:text-sm line-clamp-2">
                            {item.shortDescription}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-gray-600">
                            {item.displayName || item.variantName}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-700 mt-0.5 sm:mt-1">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-[#e63946] text-sm sm:text-base">
                            {currencySymbol}
                            {(item.variantSellingPrice * item.quantity).toFixed(
                              0
                            )}
                          </p>
                          {item.variantMRP > item.variantSellingPrice && (
                            <p className="text-[10px] sm:text-xs text-gray-400 line-through">
                              {currencySymbol}
                              {(item.variantMRP * item.quantity).toFixed(0)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 sm:gap-4">
                  <button
                    onClick={() => {
                      setCurrentStep("address");
                      updateUrlWithStep("address");
                    }}
                    className="flex-1 border-2 border-gray-300 text-gray-700 py-2.5 sm:py-3 rounded-md hover:border-gray-400 hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleContinue}
                    className="flex-1 bg-[#e63946] text-white py-2.5 sm:py-3 rounded-md hover:bg-[#c1121f] transition-colors font-semibold flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                  >
                    <span className="hidden sm:inline">Proceed to Payment</span>
                    <span className="sm:hidden">Payment</span>
                    <IconChevronRight size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Payment Step (Now Step 3 / Final) */}
            {currentStep === "payment" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                    Select Payment Method
                  </h2>

                  <div className="space-y-2 sm:space-y-3">
                    {paymentMethods.map((method) => {
                      const isCOD = method.id === 'cod';
                      const isDisabled = isCOD && !isCODAvailable;
                      
                      return (
                        <div
                          key={method.id}
                          onClick={() => {
                            if (isDisabled) {
                              setShowCODModal(true);
                            } else {
                              setSelectedPaymentMethod(method.id);
                            }
                          }}
                          className={`border-2 rounded-lg p-3 sm:p-4 transition-all ${
                            isDisabled 
                              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                              : selectedPaymentMethod === method.id
                                ? 'border-[#e63946] bg-red-50 cursor-pointer'
                                : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <span className="text-2xl sm:text-3xl">{method.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{method.name}</h3>
                                {isDisabled && (
                                  <IconAlertCircle size={16} className="text-amber-500 sm:w-5 sm:h-5" />
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {isDisabled ? 'Not available for some items' : method.description}
                              </p>
                            </div>
                            {selectedPaymentMethod === method.id && !isDisabled && (
                              <IconCheck size={20} className="text-[#e63946] sm:w-6 sm:h-6" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 sm:gap-4 mt-4 sm:mt-6">
                    <button
                      onClick={() => {
                        setCurrentStep("review");
                        updateUrlWithStep("review");
                      }}
                      className="flex-1 border-2 border-gray-300 text-gray-700 py-2.5 sm:py-3 rounded-md hover:border-gray-400 hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={!selectedPaymentMethod || isPlacingOrder}
                      className="flex-1 bg-[#e63946] text-white py-2.5 sm:py-3 rounded-md hover:bg-[#c1121f] transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      {isPlacingOrder ? (
                        <>
                          <IconLoader2 size={18} className="animate-spin" />
                          <span className="hidden sm:inline">Placing Order...</span>
                          <span className="sm:hidden">Processing...</span>
                        </>
                      ) : (
                        "Place Order"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 sticky top-24">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Order Summary
              </h3>

              <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">
                    Subtotal ({totalItems} items)
                  </span>
                  <span className="font-semibold">
                    {currencySymbol}
                    {totalPrice.toFixed(2)}
                  </span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600 text-xs sm:text-sm">
                    <span className="truncate mr-2">Coupon ({appliedCoupon.code})</span>
                    <span className="font-semibold flex-shrink-0">
                      -{currencySymbol}
                      {appliedCoupon.discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-semibold">
                    {deliveryFee === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `${currencySymbol}${deliveryFee}`
                    )}
                  </span>
                </div>
                <div className="border-t pt-2 sm:pt-3">
                  <div className="flex justify-between">
                    <span className="text-base sm:text-lg font-semibold text-gray-900">
                      Total
                    </span>
                    <span className="text-base sm:text-lg font-bold text-[#e63946]">
                      {currencySymbol}
                      {total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Coupon Code Section - Moved below Total */}
              <div className="mb-3 sm:mb-4 border-t pt-3 sm:pt-4">
                {!appliedCoupon ? (
                  <div className="space-y-2">
                    {/* Show available coupons prominently if user hasn't applied any */}
                    {availableCoupons.length > 0 && !showAvailableCoupons && (
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setShowAvailableCoupons(true)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🎁</span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {availableCoupons.length} {availableCoupons.length === 1 ? 'Coupon' : 'Coupons'} Available
                              </p>
                              <p className="text-xs text-gray-600">
                                {isFirstTimeUser ? 'Special offers for first-time users!' : 'Save more on your order'}
                              </p>
                            </div>
                          </div>
                          <IconChevronRight size={20} className="text-[#e63946]" />
                        </div>
                      </div>
                    )}

                    {/* Available Coupons List */}
                    {showAvailableCoupons && availableCoupons.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-900">Available Coupons</h4>
                          <button
                            onClick={() => setShowAvailableCoupons(false)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Hide
                          </button>
                        </div>
                        
                        {isFirstTimeUser && availableCoupons.some(c => c.isFirstTimeUserOnly) && (
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-2.5 mb-2">
                            <p className="text-xs text-green-800 font-medium flex items-center gap-1.5">
                              <span className="text-base">🎉</span>
                              First-time user special offers!
                            </p>
                          </div>
                        )}
                        
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {availableCoupons.map((coupon) => (
                            <div
                              key={coupon.id}
                              className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-[#e63946] hover:shadow-md transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <div className="bg-[#e63946] text-white px-2 py-1 rounded text-xs font-bold">
                                      {coupon.code}
                                    </div>
                                    {coupon.isFirstTimeUserOnly && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded">
                                        NEW USER
                                      </span>
                                    )}
                                  </div>
                                  {coupon.description && (
                                    <p className="text-xs text-gray-700 mb-1.5 line-clamp-2">
                                      {coupon.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                    <span className="font-medium">
                                      {coupon.discountType === 'percentage'
                                        ? `${coupon.discountValue}% OFF`
                                        : `${currencySymbol}${coupon.discountValue} OFF`}
                                    </span>
                                    {coupon.minOrderValue && (
                                      <span>• Min: {currencySymbol}{coupon.minOrderValue}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-bold text-green-600 mb-1">
                                    Save {currencySymbol}{coupon.estimatedDiscount.toFixed(2)}
                                  </p>
                                  <button 
                                    onClick={() => handleApplyCouponFromList(coupon.code)}
                                    disabled={isValidatingCoupon}
                                    className="px-3 py-1 bg-[#e63946] text-white text-xs font-semibold rounded hover:bg-[#c1121f] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                  >
                                    {isValidatingCoupon ? 'APPLYING...' : 'APPLY'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Manual Coupon Input */}
                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs sm:text-sm font-medium text-gray-700">
                        Or enter coupon code manually
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponError('');
                          }}
                          placeholder="Enter code"
                          className="flex-1 px-2.5 sm:px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#e63946] uppercase"
                          disabled={isValidatingCoupon}
                        />
                        <button
                          onClick={() => handleApplyCoupon()}
                          disabled={isValidatingCoupon || !couponCode.trim()}
                          className="px-3 sm:px-4 py-2 bg-[#e63946] text-white rounded-md text-xs sm:text-sm font-medium hover:bg-[#c1121f] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          {isValidatingCoupon ? '...' : 'Apply'}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-[10px] sm:text-xs text-red-600">{couponError}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Coupon Applied: {appliedCoupon.code}
                        </p>
                        <p className="text-xs text-green-600">
                          You saved {currencySymbol}{appliedCoupon.discountAmount.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-red-600 hover:text-red-700"
                        title="Remove coupon"
                      >
                        <IconX size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {deliveryFee > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <p className="text-xs text-yellow-800">
                    Add {currencySymbol}
                    {(499 - totalPrice).toFixed(2)} more to get free delivery!
                  </p>
                </div>
              )}

              {appliedCoupon && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-xs text-green-800 font-medium">
                    🎉 You are saving {currencySymbol}
                    {appliedCoupon.discountAmount.toFixed(2)} with coupon!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* COD Unavailable Modal */}
      {showCODModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowCODModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <IconX size={24} />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <IconAlertCircle size={28} className="text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">COD Not Available</h3>
            </div>
            
            <p className="text-gray-700 mb-4">
              Cash on Delivery is not available for the following products in your cart:
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
              <ul className="space-y-2">
                {codUnavailableProducts.map((product, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-amber-600 mt-1">•</span>
                    <span className="text-gray-800 text-sm">{product}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Please use online payment method to complete your order.
            </p>
            
            <button
              onClick={() => setShowCODModal(false)}
              className="w-full bg-[#e63946] text-white py-3 rounded-md hover:bg-[#c1121f] transition-colors font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Form data type without userId (userId is added when saving)
type AddressFormData = Omit<CreateAddressRequest, 'userId'>;

// Address Form Component
interface AddressFormProps {
  initialData?: Address | null;
  onCancel: () => void;
  onSave: (address: AddressFormData) => Promise<void>;
}

function AddressForm({ initialData, onCancel, onSave }: AddressFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data
  const [formData, setFormData] = useState<AddressFormData>({
    name: initialData?.name || "",
    phone: initialData?.phone || "",
    alternatePhone: initialData?.alternatePhone || "",
    addressLine1: initialData?.addressLine1 || "",
    addressLine2: initialData?.addressLine2 || "",
    landmark: initialData?.landmark || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    pincode: initialData?.pincode || "",
    country: initialData?.country || "", // Empty for new addresses to trigger auto-fill
    addressType: initialData?.addressType || "home",
    isDefault: initialData?.isDefault || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    if (formData.alternatePhone && formData.alternatePhone.trim()) {
      // Alternate phone validation handled by PhoneInput component
    }

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = "Address is required";
    }

    if (!formData.country || !formData.country.trim()) {
      newErrors.country = "Country is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Enter a valid 6-digit pincode";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (
    field: keyof AddressFormData,
    value: string
  ) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user types
    if (errors[field as string]) {
      setErrors({ ...errors, [field as string]: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#e63946] ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter recipient name"
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <PhoneInput
            key={`phone-${formData.country}`}
            country={formData.country}
            value={formData.phone}
            onChange={(value) => {
              handleFieldChange("phone", value);
            }}
            className={errors.phone ? "border-red-500" : ""}
          />
          {errors.phone && (
            <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Alternate Phone Number
        </label>
        <PhoneInput
          key={`alternatePhone-${formData.country}`}
          country={formData.country}
          value={formData.alternatePhone}
          onChange={(value) => {
            handleFieldChange("alternatePhone", value);
          }}
          className={errors.alternatePhone ? "border-red-500" : ""}
        />
        {errors.alternatePhone && (
          <p className="text-red-500 text-xs mt-1">{errors.alternatePhone}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address Line 1 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.addressLine1}
          onChange={(e) => handleFieldChange("addressLine1", e.target.value)}
          placeholder="House No., Building Name, Floor"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#e63946] ${
            errors.addressLine1 ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.addressLine1 && (
          <p className="text-red-500 text-xs mt-1">{errors.addressLine1}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address Line 2
        </label>
        <input
          type="text"
          value={formData.addressLine2}
          onChange={(e) => handleFieldChange("addressLine2", e.target.value)}
          placeholder="Street, Road, Area, Colony"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e63946]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Landmark
        </label>
        <input
          type="text"
          value={formData.landmark}
          onChange={(e) => handleFieldChange("landmark", e.target.value)}
          placeholder="Nearby landmark (e.g., Near Metro Station)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e63946]"
        />
      </div>

      <div className="space-y-4">
        <CountryStateCitySelect
          value={{
            country: formData.country || "",
            state: formData.state,
            city: formData.city,
          }}
          onChange={(value) => {
            setFormData({
              ...formData,
              country: value.country,
              state: value.state,
              city: value.city,
            });
            // Clear errors for these fields
            if (errors.country) setErrors({ ...errors, country: "" });
            if (errors.state) setErrors({ ...errors, state: "" });
            if (errors.city) setErrors({ ...errors, city: "" });
          }}
          required
          showLabels
          countryLabel="Country"
          stateLabel="State"
          cityLabel="City"
        />
        {(errors.country || errors.state || errors.city) && (
          <div className="space-y-1">
            {errors.country && (
              <p className="text-red-500 text-xs">{errors.country}</p>
            )}
            {errors.state && (
              <p className="text-red-500 text-xs">{errors.state}</p>
            )}
            {errors.city && (
              <p className="text-red-500 text-xs">{errors.city}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pincode <span className="text-red-500">*</span>
          </label>
          <ZipCodeInput
            country={formData.country}
            state={formData.state}
            city={formData.city}
            value={formData.pincode}
            onChange={(value) => {
              handleFieldChange("pincode", value);
            }}
            onLocationSelect={(location) => {
              setFormData((prev) => ({
                ...prev,
                city: location.city || prev.city,
                state: location.state || prev.state,
              }));
            }}
            placeholder="6-digit pincode"
          />
          {errors.pincode && (
            <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address Type
        </label>
        <div className="flex gap-4">
          {(["home", "work", "other"] as const).map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                name="addressType"
                value={type}
                checked={formData.addressType === type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    addressType: e.target.value as "home" | "work" | "other",
                  })
                }
                className="text-[#e63946] focus:ring-[#e63946]"
              />
              <span className="text-sm text-gray-700 capitalize">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isDefault"
          checked={formData.isDefault}
          onChange={(e) =>
            setFormData({ ...formData, isDefault: e.target.checked })
          }
          className="text-[#e63946] focus:ring-[#e63946] rounded"
        />
        <label htmlFor="isDefault" className="text-sm text-gray-700">
          Set as default address
        </label>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-md hover:border-gray-400 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-[#e63946] text-white py-2 rounded-md hover:bg-[#c1121f] transition-colors font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <IconLoader2 size={18} className="animate-spin" />
              Saving...
            </>
          ) : initialData ? (
            "Update Address"
          ) : (
            "Save Address"
          )}
        </button>
      </div>
    </form>
  );
}
