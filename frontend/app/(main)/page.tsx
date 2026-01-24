import HeroSection from '@/components/Home/HeroSection';
import PopularProducts from '@/components/Home/PopularProducts';
import DealsSection from '@/components/Home/DealsSection';
import MidBannerCategory from '@/components/Home/MidBannerCategory';
import TrendingProducts from '@/components/Home/TrendingProducts';
import NewArrivalProducts from '@/components/Home/NewArrivalProducts';
import HotDealsProducts from '@/components/Home/HotDealsProducts';
import { generatePageMetadata } from '@/lib/seo';
import { 
  fetchBanners, 
  fetchCategories, 
  fetchHomepageProducts 
} from '@/lib/server-fetch';

export async function generateMetadata() {
  return await generatePageMetadata({
    pagePath: "/",
    defaultTitle: "Home - ECommerce Store",
    defaultDescription: "Welcome to our online store. Shop quality products at great prices.",
    defaultKeywords: "ecommerce, online shopping, home, products",
  });
}

export default async function Home() {
  // Fetch all data in parallel on server-side using server-fetch utilities
  const [banners, categories, bestsellerProducts, trendingProducts, newArrivalProducts, hotDealsProducts] = await Promise.all([
    fetchBanners(),
    fetchCategories(),
    fetchHomepageProducts({ badge: 'Bestseller', limit: 10 }),
    fetchHomepageProducts({ badge: 'Trending', limit: 10 }),
    fetchHomepageProducts({ badge: 'New Arrival', limit: 10 }),
    fetchHomepageProducts({ badge: 'Hot Deal', limit: 10 }),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <HeroSection banners={banners} />
      
      <PopularProducts 
        initialProducts={bestsellerProducts} 
        categories={categories} 
      />
      <DealsSection categories={categories} />
      <NewArrivalProducts products={newArrivalProducts} />
      <HotDealsProducts products={hotDealsProducts} />
      
      <MidBannerCategory />
      <TrendingProducts products={trendingProducts} />
    </div>
  );
}
