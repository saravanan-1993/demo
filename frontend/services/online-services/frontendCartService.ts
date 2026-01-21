import axiosInstance from "@/lib/axios";

export interface CartItemRequest {
  userId: string;
  inventoryProductId: string;
  quantity: number;
  selectedCuttingStyle?: string;
}

export interface CartItemResponse {
  id: string;
  userId: string;
  customerId?: string; // Added for consistency with backend
  inventoryProductId: string;
  quantity: number;
  productId: string;
  variantIndex: number;
  maxStock: number;
  shortDescription: string;
  brand: string;
  category: string; // Product category name
  categoryId: string; // Product category ID
  variantName: string;
  displayName?: string; // Added to match backend response
  variantSellingPrice: number;
  variantMRP: number;
  variantImage: string;
  selectedCuttingStyle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartResponse {
  success: boolean;
  data: CartItemResponse[];
  totalItems: number;
  totalPrice: number;
  totalSavings: number;
}

/**
 * Get user's cart from database
 */
export const getCart = async (userId: string): Promise<CartResponse> => {
  const response = await axiosInstance.get("/api/online/cart", {
    params: { userId }
  });
  return response.data;
};

/**
 * Add item to cart in database
 */
export const addToCart = async (item: CartItemRequest): Promise<{ success: boolean; data: CartItemResponse }> => {
  const response = await axiosInstance.post("/api/online/cart", item);
  return response.data;
};

/**
 * Update cart item quantity in database
 * selectedCuttingStyle is used to identify the specific cart item
 */
export const updateCartItem = async (
  userId: string,
  inventoryProductId: string, 
  quantity: number,
  selectedCuttingStyle?: string
): Promise<{ success: boolean; data: CartItemResponse }> => {
  const response = await axiosInstance.put(`/api/online/cart/${inventoryProductId}`, { 
    userId,
    quantity,
    selectedCuttingStyle
  });
  return response.data;
};

/**
 * Remove item from cart in database
 * selectedCuttingStyle is used to identify the specific cart item
 */
export const removeFromCart = async (
  userId: string, 
  inventoryProductId: string,
  selectedCuttingStyle?: string
): Promise<{ success: boolean }> => {
  const response = await axiosInstance.delete(`/api/online/cart/${inventoryProductId}`, {
    params: { userId, selectedCuttingStyle }
  });
  return response.data;
};

/**
 * Clear entire cart in database
 */
export const clearCart = async (userId: string): Promise<{ success: boolean }> => {
  const response = await axiosInstance.delete("/api/online/cart", {
    params: { userId }
  });
  return response.data;
};

/**
 * Sync local cart to database (used on login)
 */
export const syncCart = async (userId: string, items: Omit<CartItemRequest, 'userId'>[]): Promise<CartResponse> => {
  const response = await axiosInstance.post("/api/online/cart/sync", { 
    userId,
    items 
  });
  return response.data;
};


