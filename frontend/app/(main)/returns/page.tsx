import { PolicyPage } from "@/components/policies/policy-page";
import { generatePageMetadata } from '@/lib/seo';
import { fetchPolicy } from '@/lib/server-fetch';

export async function generateMetadata() {
  return await generatePageMetadata({
    pagePath: "/returns",
    defaultTitle: "Returns & Refunds Policy | Leats",
    defaultDescription: "Learn about our hassle-free returns and exchanges policy.",
    defaultKeywords: "returns, exchanges, refund policy, return policy, customer service",
  });
}

export default async function ReturnsPage() {
  const policy = await fetchPolicy('returns-refunds');
  
  return <PolicyPage initialPolicy={policy} slug="returns-refunds" defaultTitle="Returns & Refunds Policy" />;
}
