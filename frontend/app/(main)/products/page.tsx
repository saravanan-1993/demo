import ProductsPageClient from '@/components/products/ProductsPageClient';
import { generatePageMetadata } from '@/lib/seo';
import { fetchProducts, fetchCategories } from '@/lib/server-fetch';
import { badgeService } from '@/services/online-services/badgeService';

export async function generateMetadata() {
  return await generatePageMetadata({
    pagePath: "/products",
    defaultTitle: "All Products | Leats - Fresh Groceries & Daily Essentials",
    defaultDescription: "Browse our wide selection of fresh groceries, fruits, vegetables, dairy products, and daily essentials. Shop online for quality products at the best prices with fast delivery.",
    defaultKeywords: "groceries, fresh products, online shopping, fruits, vegetables, dairy, daily essentials, food delivery",
  });
}

export default async function ProductsPage() {
  // Fetch initial data on server-side
  const [productsData, categories] = await Promise.all([
    fetchProducts({ 
      page: 1, 
      limit: 15, 
      sortBy: 'createdAt', 
      sortOrder: 'desc' 
    }),
    fetchCategories(),
  ]);

  // Fetch all products to extract brands (for filter)
  const allProductsForBrands = await fetchProducts({ page: 1, limit: 200 });
  const availableBrands = [...new Set(
    allProductsForBrands.data?.map((p: any) => p.brand).filter(Boolean)
  )].sort();

  return (
    <ProductsPageClient 
      initialProducts={productsData.data || []}
      initialPagination={productsData.pagination}
      categories={categories}
      availableBrands={availableBrands}
    />
  );
}
