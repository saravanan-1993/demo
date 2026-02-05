import  axiosInstance  from "@/lib/axios";

export interface CategoryData {
  id: string;
  categoryName: string;
  subcategoryName: string;
  sortOrder?: number;
  categoryImage?: string;
  subcategoryImage?: string;
  categoryMetaTitle?: string;
  categoryMetaDescription?: string;
  categoryMetaKeywords?: string;
  subcategoryMetaTitle?: string;
  subcategoryMetaDescription?: string;
  subcategoryMetaKeywords?: string;
  categoryIsActive: boolean;
  subcategoryIsActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryFormData {
  categoryName: string;
  subcategoryName: string;
  sortOrder?: number;
  categoryMetaTitle?: string;
  categoryMetaDescription?: string;
  categoryMetaKeywords?: string;
  subcategoryMetaTitle?: string;
  subcategoryMetaDescription?: string;
  subcategoryMetaKeywords?: string;
  categoryIsActive?: boolean;
  subcategoryIsActive?: boolean;
}

export interface CategoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryStatus?: string;
  subcategoryStatus?: string;
}

export interface CategoryListResponse {
  success: boolean;
  data: CategoryData[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CategoryResponse {
  success: boolean;
  data: CategoryData;
  message?: string;
}

export interface CategoryNamesResponse {
  success: boolean;
  data: { _id: string; name: string }[];
}



export interface EnhancedSEOResponse {
  success: boolean;
  data: {
    category: {
      categoryMetaTitle: string;
      categoryMetaDescription: string;
      categoryMetaKeywords: string;
    };
    subcategory?: {
      subcategoryMetaTitle: string;
      subcategoryMetaDescription: string;
      subcategoryMetaKeywords: string;
    };
    detectedCompanyName?: string;
  };
  message?: string;
}

class CategoryService {
  private baseURL = "/api/online/category-subcategory";

  // Get all categories with pagination and filters
  async getCategories(
    params: CategoryListParams = {}
  ): Promise<CategoryListResponse> {
    const response = await axiosInstance.get(this.baseURL, { params });
    return response.data;
  }

  // Get category names for dropdown
  async getCategoryNames(): Promise<CategoryNamesResponse> {
    const response = await axiosInstance.get(`${this.baseURL}/names`);
    return response.data;
  }

  // Get subcategories for a specific category
  async getSubcategoriesByCategory(categoryName: string): Promise<{
    success: boolean;
    data: string[];
  }> {
    try {
      const response = await axiosInstance.get(
        `${this.baseURL}/subcategories/${encodeURIComponent(categoryName)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      return { success: false, data: [] };
    }
  }

  // Get subcategories with IDs for a specific category
  async getSubcategoriesWithIds(categoryName: string): Promise<{
    success: boolean;
    data: { id: string; name: string }[];
  }> {
    try {
      const response = await axiosInstance.get(
        `${this.baseURL}/subcategories-with-ids/${encodeURIComponent(categoryName)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching subcategories with IDs:", error);
      return { success: false, data: [] };
    }
  }

  // Get category SEO data by name
  async getCategoryByName(categoryName: string): Promise<CategoryResponse> {
    const response = await axiosInstance.get(
      `${this.baseURL}/by-name/${encodeURIComponent(categoryName)}`
    );
    return response.data;
  }

  // Get category by ID
  async getCategoryById(id: string): Promise<CategoryResponse> {
    const response = await axiosInstance.get(`${this.baseURL}/${id}`);
    return response.data;
  }

  // Create category only (without subcategory)
  async createCategoryOnly(data: {
    categoryName: string;
  }): Promise<CategoryResponse> {
    const response = await axiosInstance.post(
      `${this.baseURL}/category-only`,
      data
    );
    return response.data;
  }

  // Create new category with images
  async createCategory(
    data: CategoryFormData,
    categoryImage?: File,
    subcategoryImage?: File
  ): Promise<CategoryResponse> {
    const formData = new FormData();

    // Append form fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    // Append images if provided
    if (categoryImage) {
      formData.append("categoryImage", categoryImage);
    }
    if (subcategoryImage) {
      formData.append("subcategoryImage", subcategoryImage);
    }

    const response = await axiosInstance.post(this.baseURL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  // Update category with images
  async updateCategory(
    id: string,
    data: CategoryFormData,
    categoryImage?: File,
    subcategoryImage?: File
  ): Promise<CategoryResponse> {
    const formData = new FormData();

    // Append form fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    // Append images if provided
    if (categoryImage) {
      formData.append("categoryImage", categoryImage);
    }
    if (subcategoryImage) {
      formData.append("subcategoryImage", subcategoryImage);
    }

    const response = await axiosInstance.put(
      `${this.baseURL}/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  }

  // Delete category
  async deleteCategory(
    id: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await axiosInstance.delete(`${this.baseURL}/${id}`);
    return response.data;
  }

  // Toggle category status
  async toggleCategoryStatus(
    id: string,
    type: "category" | "subcategory"
  ): Promise<CategoryResponse> {
    const response = await axiosInstance.put(
      `${this.baseURL}/${id}/toggle-status`,
      { type }
    );
    return response.data;
  }

  // Generate enhanced SEO for both category and subcategory
  async generateEnhancedSEO(
    categoryName: string,
    subcategoryName?: string,
    companyName?: string
  ): Promise<EnhancedSEOResponse> {
    const response = await axiosInstance.post(
      `${this.baseURL}/generate-enhanced-seo`,
      {
        categoryName,
        subcategoryName,
        companyName,
      }
    );
    return response.data;
  }

  // Update category name only (for inline editing in dropdown)
  async updateCategoryName(
    categoryId: string,
    newCategoryName: string
  ): Promise<CategoryResponse> {
    const response = await axiosInstance.put(
      `${this.baseURL}/${categoryId}`,
      {
        categoryName: newCategoryName,
      }
    );
    return response.data;
  }
}

export const categoryService = new CategoryService();