import { Metadata } from 'next';
import CategoryDetailClient from '@/components/category/CategoryDetailClient';
import { fetchCategoryById, fetchProducts, fetchCategories } from '@/lib/server-fetch';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const lastSegment = slug[slug.length - 1];
  const isSubcategoryUrl = slug.length >= 3;
  
  let title = 'Category | Leats';
  let description = 'Browse products in this category';
  
  try {
    if (isSubcategoryUrl) {
      // Fetch subcategory data for metadata
      const subcategoryId = lastSegment;
      // Note: We need a fetchSubcategoryById function in server-fetch.ts
      title = `Products | Leats`;
      description = 'Browse our selection of quality products';
    } else {
      const categoryId = lastSegment;
      const category = await fetchCategoryById(categoryId);
      if (category) {
        title = `${category.name} | Leats - Fresh Groceries & Daily Essentials`;
        description = `Browse ${category.name.toLowerCase()} products. Find fresh groceries and daily essentials at the best prices with fast delivery.`;
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error);
  }

  return {
    title,
    description,
    keywords: 'category, groceries, fresh products, online shopping, food delivery',
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const lastSegment = slug[slug.length - 1];
  const isSubcategoryUrl = slug.length >= 3;
  
  // Fetch categories for navigation
  const categories = await fetchCategories();
  
  if (isSubcategoryUrl) {
    const subId = lastSegment;
    
    // Fetch initial products for this subcategory
    const productsData = await fetchProducts({
      subCategory: subId,
      page: 1,
      limit: 15,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    
    // Fetch brands for this subcategory
    const allProductsForBrands = await fetchProducts({ 
      subCategory: subId, 
      page: 1, 
      limit: 200 
    });
    
    const availableBrands = [...new Set(
      (allProductsForBrands.data || [])
        .filter((p: { brand?: string }) => typeof p.brand === 'string')
        .map((p: { brand: string }) => p.brand)
    )].sort() as string[];
    
    return (
      <CategoryDetailClient 
        subcategoryId={subId}
        categories={categories}
        initialProducts={productsData.data || []}
        initialPagination={productsData.pagination}
        availableBrands={availableBrands}
      />
    );
  } else {
    const categoryId = lastSegment;
    
    // Fetch category data
    const category = await fetchCategoryById(categoryId);
    if (!category) {
      notFound();
    }
    
    // Fetch initial products for this category
    const productsData = await fetchProducts({
      category: category.name,
      page: 1,
      limit: 15,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    
    // Fetch brands for this category
    const allProductsForBrands = await fetchProducts({ 
      category: category.name, 
      page: 1, 
      limit: 200 
    });
    
    const availableBrands = [...new Set(
      (allProductsForBrands.data || [])
        .filter((p: { brand?: string }) => typeof p.brand === 'string')
        .map((p: { brand: string }) => p.brand)
    )].sort() as string[];
    
    return (
      <CategoryDetailClient 
        categoryId={categoryId}
        initialCategory={category}
        categories={categories}
        initialProducts={productsData.data || []}
        initialPagination={productsData.pagination}
        availableBrands={availableBrands}
      />
    );
  }
}
