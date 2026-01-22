import { Metadata } from 'next';
import ProductDetailClient from '@/components/products/ProductDetailClient';
import { fetchProductById, fetchProducts, fetchFrequentlyBoughtTogether } from '@/lib/server-fetch';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ slug: string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const productId = slug[slug.length - 1];
  
  // Fetch product for metadata
  const product = await fetchProductById(productId);
  
  if (!product) {
    return {
      title: 'Product Not Found | Leats',
      description: 'The product you are looking for could not be found.',
    };
  }

  const defaultVariant = product.variants?.find((v: any) => v.isDefault) || product.variants?.[0];
  const productName = defaultVariant?.displayName || product.shortDescription;
  const price = defaultVariant?.variantSellingPrice || product.defaultSellingPrice;

  return {
    title: `${productName} | Leats - Fresh Groceries & Daily Essentials`,
    description: defaultVariant?.detailedDescription || product.shortDescription || 'View detailed product information and shop online',
    keywords: `${productName}, ${product.brand}, ${product.category}, online shopping, groceries, buy online`,
    openGraph: {
      title: `${productName} | Leats`,
      description: product.shortDescription,
      type: 'website',
      images: defaultVariant?.variantImages?.[0] ? [defaultVariant.variantImages[0]] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const productId = slug[slug.length - 1];
  
  // Fetch product data on server-side
  const product = await fetchProductById(productId);
  
  if (!product) {
    notFound();
  }

  // Fetch related products and frequently bought together in parallel
  const [relatedProductsData, frequentlyBoughtTogetherData] = await Promise.all([
    fetchProducts({ category: product.category, limit: 5 }),
    fetchFrequentlyBoughtTogether(productId),
  ]);

  // Filter out current product from related products
  const relatedProducts = relatedProductsData.data?.filter((p: any) => p.id !== productId) || [];
  
  return (
    <ProductDetailClient 
      productId={productId}
      initialProduct={product}
      initialRelatedProducts={relatedProducts}
      initialFrequentlyBoughtTogether={frequentlyBoughtTogetherData}
    />
  );
}
