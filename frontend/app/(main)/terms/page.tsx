import { PolicyPage } from "@/components/policies/policy-page";
import { generatePageMetadata } from '@/lib/seo';
import { fetchPolicy } from '@/lib/server-fetch';

export async function generateMetadata() {
  return await generatePageMetadata({
    pagePath: "/terms",
    defaultTitle: "Terms & Conditions | Leats",
    defaultDescription: "Read our terms of service and user agreements.",
    defaultKeywords: "terms and conditions, terms of service, user agreement, legal",
  });
}

export default async function TermsPage() {
  const policy = await fetchPolicy('terms-conditions');
  
  return <PolicyPage initialPolicy={policy} slug="terms-conditions" defaultTitle="Terms & Conditions" />;
}
