/**
 * Server-side data fetching utilities
 * These functions are used in Server Components for SSR/SSG
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Fetch banners for hero section
 */
export async function fetchBanners() {
  try {
    const res = await fetch(`${API_URL}/api/web/banners`, {
      cache: 'no-store', // Always get fresh data
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching banners:', error);
    return [];
  }
}

/**
 * Fetch categories
 */
export async function fetchCategories() {
  try {
    const res = await fetch(`${API_URL}/api/online/frontend/categories`, {
      cache: 'no-store', // Always get fresh data
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Fetch homepage products by badge
 */
export async function fetchHomepageProducts(params: {
  badge?: string;
  category?: string;
  limit?: number;
}) {
  try {
    const queryParams = new URLSearchParams();
    if (params.badge) queryParams.append('badge', params.badge);
    if (params.category) queryParams.append('category', params.category);
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const res = await fetch(
      `${API_URL}/api/online/frontend/homepage-products?${queryParams.toString()}`,
      {
        cache: 'no-store', // Always get fresh data
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error(`Error fetching homepage products:`, error);
    return [];
  }
}

/**
 * Fetch products with filters
 */
export async function fetchProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subCategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: string;
  badge?: string;
  includeVariantPriceFilter?: string;
}) {
  try {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const res = await fetch(
      `${API_URL}/api/online/frontend/products?${queryParams.toString()}`,
      {
        cache: 'no-store', // Always get fresh data
      }
    );
    if (!res.ok) {
      return { success: false, data: [], pagination: null };
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    return { success: false, data: [], pagination: null };
  }
}

/**
 * Fetch single product by ID
 */
export async function fetchProductById(id: string) {
  try {
    const res = await fetch(`${API_URL}/api/online/frontend/products/${id}`, {
      cache: 'no-store', // Always get fresh data
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

/**
 * Fetch frequently bought together products
 */
export async function fetchFrequentlyBoughtTogether(productId: string) {
  try {
    const res = await fetch(
      `${API_URL}/api/online/frontend/products/${productId}/frequently-bought-together`,
      {
        cache: 'no-store', // Always get fresh data
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching frequently bought together:', error);
    return [];
  }
}

/**
 * Fetch category by ID
 */
export async function fetchCategoryById(id: string) {
  try {
    const res = await fetch(`${API_URL}/api/online/frontend/categories/${id}`, {
      cache: 'no-store', // Always get fresh data
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
}

/**
 * Fetch web settings (logo, favicon, etc.)
 */
export async function fetchWebSettings() {
  try {
    const res = await fetch(`${API_URL}/api/web/web-settings`, {
      cache: 'no-store', // Always get fresh data
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching web settings:', error);
    return null;
  }
}

/**
 * Fetch company settings (name, address, contact, social media)
 */
export async function fetchCompanySettings() {
  try {
    const res = await fetch(`${API_URL}/api/web/company`, {
      cache: 'no-store', // Always get fresh data
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return null;
  }
}

/**
 * Fetch published policy by slug
 */
export async function fetchPolicy(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/web/policies/public/${slug}`, {
      cache: 'no-store', // Always get fresh data
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching policy:', error);
    return null;
  }
}

/**
 * Fetch promotional coupons for header display
 */
export async function fetchPromotionalCoupons() {
  try {
    const res = await fetch(`${API_URL}/api/online/coupons/promotional`, {
      cache: 'no-store', // Always get fresh data
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching promotional coupons:', error);
    return [];
  }
}
