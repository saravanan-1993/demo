'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Product } from '@/services/online-services/frontendProductService';
import * as cartService from '@/services/online-services/frontendCartService';
import type { CartItemResponse } from '@/services/online-services/frontendCartService';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/providers/auth-provider';


export interface CartItem {
  productId: string;
  inventoryProductId: string;
  variantIndex: number;
  quantity: number;
  maxStock: number; // Available stock for validation
  // Cached product data for display
  shortDescription: string;
  brand: string;
  variantName: string;
  displayName: string; // User-friendly display name
  variantSellingPrice: number;
  variantMRP: number;
  variantImage: string;
  selectedCuttingStyle?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, variantIndex: number, cuttingStyle?: string) => Promise<void>;
  removeFromCart: (productId: string, inventoryProductId: string, selectedCuttingStyle?: string) => Promise<void>;
  updateQuantity: (productId: string, inventoryProductId: string, quantity: number, selectedCuttingStyle?: string) => Promise<void>;
  getItemQuantity: (productId: string, inventoryProductId: string, selectedCuttingStyle?: string) => number;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  totalSavings: number;
  isLoading: boolean;
  isInitialized: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();

  const loadCart = useCallback(async () => {
    if (!isAuthenticated || !user?.id || user?.role !== 'user') return;

    try {
      setIsLoading(true);
      const response = await cartService.getCart(user.id);
      
      const validatedItems = response.data.map((item: CartItemResponse) => ({
        productId: item.productId,
        inventoryProductId: item.inventoryProductId,
        variantIndex: item.variantIndex,
        quantity: item.quantity,
        maxStock: item.maxStock,
        shortDescription: item.shortDescription,
        brand: item.brand,
        variantName: item.variantName,
        displayName: item.displayName || item.variantName,
        variantSellingPrice: item.variantSellingPrice,
        variantMRP: item.variantMRP,
        variantImage: item.variantImage,
        selectedCuttingStyle: item.selectedCuttingStyle,
      }));
      
      setItems(validatedItems);
    } catch (error) {
      console.error('Error loading cart from backend:', error);
      
      if (error && typeof error === 'object' && ('code' in error || 'message' in error)) {
        const err = error as { code?: string; message?: string };
        if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
          toast.error('Unable to load cart. Please check your connection.');
        }
      }
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [isAuthenticated, user?.id, user?.role]);

  // Load cart when user logs in
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated && user?.id && user?.role === 'user') {
      loadCart();
    } else {
      // Clear cart when user logs out or is admin
      setItems([]);
      setIsInitialized(true);
    }
  }, [user?.id, user?.role, isAuthenticated, loadCart, authLoading]);

  // Add cart validation on mount - check if cart is empty but should have items
  useEffect(() => {
    if (!isInitialized || !isAuthenticated || user?.role !== 'user') return;
    
    // If cart is empty after loading, it might have been cleared
    // This is normal, but we log it for debugging
    if (items.length === 0) {
      console.log('Cart is empty after loading');
    }
  }, [isInitialized, items.length, isAuthenticated, user?.role]);

  const addToCart = async (product: Product, variantIndex: number, cuttingStyle?: string) => {
    // Check if user is authenticated and is a customer (not admin)
    if (!isAuthenticated || !user?.id) {
      toast.error('Please log in to add items to your cart');
      // Automatically redirect to signin page after a short delay to show toast
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/signin';
        }, 1500);
      }
      return;
    }

    if (user?.role !== 'user') {
      toast.error('Cart is only available for customers');
      return;
    }

    const variant = product.variants[variantIndex];
    const inventoryProductId = variant.inventoryProductId || '';
    const availableStock = variant.variantStockQuantity;
    
    // Check stock availability
    if (availableStock <= 0) {
      toast.error('This item is currently out of stock');
      return;
    }

    // Check if item already exists with SAME cutting style
    // Different cutting styles = different cart items
    const existingItem = items.find(
      item => item.productId === product.id && 
              item.inventoryProductId === inventoryProductId &&
              (item.selectedCuttingStyle || null) === (cuttingStyle || null)
    );

    // Calculate total quantity for this variant across all cutting styles (for stock validation)
    const totalVariantQuantity = items
      .filter(item => item.inventoryProductId === inventoryProductId)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (existingItem) {
      // Check if we can add more (total across all cutting styles)
      if (totalVariantQuantity >= availableStock) {
        toast.warning(`Only ${availableStock} items available in stock`);
        return;
      }
      
      const newQuantity = existingItem.quantity + 1;
      
      // Optimistic update
      setItems(prev => prev.map(item => {
        if (item.productId === product.id && 
            item.inventoryProductId === inventoryProductId &&
            (item.selectedCuttingStyle || null) === (cuttingStyle || null)) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      }));

      try {
        await cartService.addToCart({
          userId: user.id,
          inventoryProductId,
          quantity: 1,
          selectedCuttingStyle: cuttingStyle
        });
        toast.success('Cart updated');
      } catch (error) {
        console.error('Error updating cart:', error);
        // Revert (reload cart)
        loadCart();
        toast.error('Failed to update cart');
      }

      return;
    }

    // Check stock for new item (total across all cutting styles)
    if (totalVariantQuantity >= availableStock) {
      toast.warning(`Only ${availableStock} items available in stock`);
      return;
    }

    // New Item
    // Optimistically update UI
    const newItem: CartItem = {
      productId: product.id,
      inventoryProductId,
      variantIndex,
      quantity: 1,
      maxStock: availableStock,
      shortDescription: product.shortDescription,
      brand: product.brand,
      variantName: variant.variantName,
      displayName: variant.displayName || variant.variantName,
      variantSellingPrice: variant.variantSellingPrice,
      variantMRP: variant.variantMRP,
      variantImage: variant.variantImages?.[0] || '/placeholder-product.png',
      selectedCuttingStyle: cuttingStyle,
    };

    setItems(prev => [...prev, newItem]);

    try {
      await cartService.addToCart({
        userId: user.id,
        inventoryProductId,
        quantity: 1,
        selectedCuttingStyle: cuttingStyle,
      });
      toast.success('Added to cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
    // Revert on error - need to match by cutting style too
      setItems(prev => prev.filter(item => 
        !(item.inventoryProductId === inventoryProductId && 
          (item.selectedCuttingStyle || null) === (cuttingStyle || null))
      ));
      
      // Handle specific error cases
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { error?: string } } };
        
        // Handle 404 Customer not found error
        if (axiosError.response?.status === 404 && 
            axiosError.response?.data?.error?.includes('Customer not found')) {
          toast.error('Account setup in progress. Please wait a moment and try again.', {
            duration: 4000,
          });
          
          // Auto-retry after 2 seconds
          setTimeout(async () => {
            try {
              await cartService.addToCart({
                userId: user.id,
                inventoryProductId,
                quantity: 1,
                selectedCuttingStyle: cuttingStyle,
              });
              setItems(prev => [...prev, newItem]);
              toast.success('Added to cart');
            } catch (retryError) {
              console.error('Retry failed:', retryError);
            }
          }, 2000);
          return;
        }
      }
      
      toast.error('Failed to add item to cart');
    }
  };

  const removeFromCart = async (productId: string, inventoryProductId: string, selectedCuttingStyle?: string) => {
    // Check if user is authenticated and is a customer
    if (!isAuthenticated || !user?.id) {
      toast.error('Please log in to manage your cart');
      // Automatically redirect to signin page after a short delay to show toast
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/signin';
        }, 1500);
      }
      return;
    }

    if (user?.role !== 'user') {
      toast.error('Cart is only available for customers');
      return;
    }

    // Optimistic update - match by cutting style too
    const previousItems = items;
    setItems(prev => prev.filter(
      item => !(item.productId === productId && 
                item.inventoryProductId === inventoryProductId &&
                (item.selectedCuttingStyle || null) === (selectedCuttingStyle || null))
    ));

    try {
      await cartService.removeFromCart(user.id, inventoryProductId, selectedCuttingStyle);
      toast.success('Removed from cart');
    } catch (error) {
      console.error('Error removing from cart:', error);
      // Revert on error
      setItems(previousItems);
      
      // Handle specific error cases
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { error?: string } } };
        
        // Handle 404 Customer not found error
        if (axiosError.response?.status === 404 && 
            axiosError.response?.data?.error?.includes('Customer not found')) {
          toast.error('Account setup in progress. Please refresh the page and try again.', {
            duration: 4000,
          });
          return;
        }
      }
      
      toast.error('Failed to remove item from cart');
    }
  };

  const updateQuantity = async (productId: string, inventoryProductId: string, quantity: number, selectedCuttingStyle?: string) => {
    // Check if user is authenticated and is a customer
    if (!isAuthenticated || !user?.id) {
      toast.error('Please log in to manage your cart');
      // Automatically redirect to signin page after a short delay to show toast
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/signin';
        }, 1500);
      }
      return;
    }

    if (user?.role !== 'user') {
      toast.error('Cart is only available for customers');
      return;
    }

    if (quantity <= 0) {
      await removeFromCart(productId, inventoryProductId, selectedCuttingStyle);
      return;
    }

    // Find the specific item
    const targetItem = items.find(
      item => item.productId === productId && 
              item.inventoryProductId === inventoryProductId &&
              (item.selectedCuttingStyle || null) === (selectedCuttingStyle || null)
    );

    if (!targetItem) {
      console.error('Target item not found in cart:', { productId, inventoryProductId, selectedCuttingStyle });
      return;
    }

    console.log('Updating cart item:', {
      productId,
      inventoryProductId,
      quantity,
      selectedCuttingStyle,
      targetItem
    });

    // Calculate total quantity for this variant across all cutting styles (excluding current item)
    const otherItemsQuantity = items
      .filter(item => item.inventoryProductId === inventoryProductId &&
                      !((item.selectedCuttingStyle || null) === (selectedCuttingStyle || null)))
      .reduce((sum, item) => sum + item.quantity, 0);

    const maxAllowedForThis = targetItem.maxStock - otherItemsQuantity;
    
    // Optimistic update
    const previousItems = items;
    setItems(prev => prev.map(item => {
      if (item.productId === productId && 
          item.inventoryProductId === inventoryProductId &&
          (item.selectedCuttingStyle || null) === (selectedCuttingStyle || null)) {
        // Validate against max stock
        const validatedQuantity = Math.min(quantity, maxAllowedForThis);
        if (validatedQuantity < quantity) {
          toast.warning(`Only ${targetItem.maxStock} items available in stock`);
        }
        return { ...item, quantity: validatedQuantity };
      }
      return item;
    }));

    try {
      await cartService.updateCartItem(user.id, inventoryProductId, quantity, selectedCuttingStyle);
    } catch (error) {
      console.error('Error updating cart:', error);
      
      // Handle specific error cases
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { error?: string } } };
        
        // Handle 404 - Cart item not found (stale data)
        if (axiosError.response?.status === 404) {
          // Don't show multiple toasts, just refresh silently
          console.log('Cart item not found, refreshing cart from server...');
          await loadCart();
          toast.info('Cart updated from server', {
            duration: 2000,
          });
          return;
        }
        
        // Handle 404 Customer not found error
        if (axiosError.response?.status === 404 && 
            axiosError.response?.data?.error?.includes('Customer not found')) {
          toast.error('Account setup in progress. Please refresh the page and try again.', {
            duration: 4000,
          });
          // Reload cart from server
          await loadCart();
          return;
        }
      }
      
      // Revert on other errors
      setItems(previousItems);
      toast.error('Failed to update cart');
    }
  };

  const getItemQuantity = (productId: string, inventoryProductId: string, selectedCuttingStyle?: string): number => {
    if (!isAuthenticated || user?.role !== 'user') return 0;
    
    const item = items.find(
      item => item.productId === productId && 
              item.inventoryProductId === inventoryProductId &&
              (item.selectedCuttingStyle || null) === (selectedCuttingStyle || null)
    );
    return item?.quantity || 0;
  };

  const clearCart = async () => {
    // Check if user is authenticated and is a customer
    if (!isAuthenticated || !user?.id) {
      toast.error('Please log in to manage your cart');
      // Automatically redirect to signin page after a short delay to show toast
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/signin';
        }, 1500);
      }
      return;
    }

    if (user?.role !== 'user') {
      toast.error('Cart is only available for customers');
      return;
    }

    // Optimistic update
    const previousItems = items;
    setItems([]);

    try {
      await cartService.clearCart(user.id);
      // No toast here - let the caller decide whether to show a message
    } catch (error) {
      console.error('Error clearing cart:', error);
      // Revert on error
      setItems(previousItems);
      
      // Handle specific error cases
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { error?: string } } };
        
        // Handle 404 Customer not found error
        if (axiosError.response?.status === 404 && 
            axiosError.response?.data?.error?.includes('Customer not found')) {
          toast.error('Account setup in progress. Please refresh the page and try again.', {
            duration: 4000,
          });
          return;
        }
      }
      
      toast.error('Failed to clear cart');
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const totalPrice = items.reduce(
    (sum, item) => sum + (item.variantSellingPrice * item.quantity), 
    0
  );
  
  const totalSavings = items.reduce(
    (sum, item) => sum + ((item.variantMRP - item.variantSellingPrice) * item.quantity), 
    0
  );

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      getItemQuantity,
      clearCart,
      totalItems,
      totalPrice,
      totalSavings,
      isLoading,
      isInitialized,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
