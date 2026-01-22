import AboutPageClient from '@/components/about/AboutPageClient';
import { generatePageMetadata } from '@/lib/seo';
import { fetchCategories } from '@/lib/server-fetch';

export async function generateMetadata() {
  return await generatePageMetadata({
    pagePath: "/about",
    defaultTitle: "About Us | Leats - Fresh Groceries & Daily Essentials",
    defaultDescription: "Learn about Leats - your trusted online destination for fresh groceries, organic produce, and everyday essentials. 10-minute delivery, best prices, and quality products.",
    defaultKeywords: "about leats, grocery store, online shopping, fresh groceries, 10 minute delivery, organic produce",
  });
}

export default async function AboutPage() {
  // Fetch categories on server-side
  const categories = await fetchCategories();

  return <AboutPageClient initialCategories={categories} />;
}
