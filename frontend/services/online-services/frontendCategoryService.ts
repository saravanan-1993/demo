import axiosInstance from "@/lib/axios";

export interface Subcategory {
  id: string;
  name: string;
  image: string | null;
  sortOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export interface Category {
  id: string;
  name: string;
  image: string | null;
  sortOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  subcategories: Subcategory[];
}

export interface CategoriesResponse {
  success: boolean;
  data: Category[];
}

export interface CategoryResponse {
  success: boolean;
  data: Category;
}

export interface SubcategoriesResponse {
  success: boolean;
  data: Subcategory[];
}

export interface SubcategoryResponse {
  success: boolean;
  data: Subcategory & {
    categoryId: string;
    categoryName: string;
    categoryImage: string | null;
  };
}

/**
 * Get all categories with subcategories
 */
export const getCategories = async (): Promise<CategoriesResponse> => {
  const response = await axiosInstance.get("/api/online/frontend/categories");
  return response.data;
};

/**
 * Get category by ID or name
 */
export const getCategoryByIdentifier = async (identifier: string): Promise<CategoryResponse> => {
  const response = await axiosInstance.get(`/api/online/frontend/categories/${identifier}`);
  return response.data;
};

/**
 * Get subcategories by category
 */
export const getSubcategoriesByCategory = async (categoryIdentifier: string): Promise<SubcategoriesResponse> => {
  const response = await axiosInstance.get("/api/online/frontend/subcategories", {
    params: { category: categoryIdentifier },
  });
  return response.data;
};

/**
 * Get subcategory by ID
 */
export const getSubcategoryById = async (id: string): Promise<SubcategoryResponse> => {
  const response = await axiosInstance.get(`/api/online/frontend/subcategories/${id}`);
  return response.data;
};
