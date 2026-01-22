import CategoriesPageClient from '@/components/category/CategoriesPageClient';
import { generatePageMetadata } from '@/lib/seo';
import { fetchCategories } from '@/lib/server-fetch';

export async function generateMetadata() {
  return await generatePageMetadata({
    pagePath: "/category",
    defaultTitle: "All Categories | Leats - Fresh Groceries & Daily Essentials",
    defaultDescription: "Browse all product categories including fresh fruits, vegetables, dairy, groceries, and daily essentials. Shop by category for a better shopping experience.",
    defaultKeywords: "categories, groceries, fruits, vegetables, dairy, daily essentials, online shopping",
  });
}

export default async function CategoriesPage() {
  // Fetch categories on server-side
  const categories = await fetchCategories();

  return <CategoriesPageClient initialCategories={categories} />;
}
