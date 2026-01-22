import { PolicyPage } from "@/components/policies/policy-page";
import { generatePageMetadata } from '@/lib/seo';
import { fetchPolicy } from '@/lib/server-fetch';

export async function generateMetadata() {
  return await generatePageMetadata({
    pagePath: "/shipping",
    defaultTitle: "Shipping & Delivery Policy | Leats",
    defaultDescription: "Learn about our shipping methods, costs, and delivery times.",
    defaultKeywords: "shipping policy, delivery, shipping charges, delivery time, fast delivery",
  });
}

export default async function ShippingPage() {
  const policy = await fetchPolicy('shipping-policy');
  
  return <PolicyPage initialPolicy={policy} slug="shipping-policy" defaultTitle="Shipping & Delivery Policy" />;
}
