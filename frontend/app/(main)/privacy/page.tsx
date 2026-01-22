import { PolicyPage } from "@/components/policies/policy-page";
import { generatePageMetadata } from '@/lib/seo';
import { fetchPolicy } from '@/lib/server-fetch';

export async function generateMetadata() {
  return await generatePageMetadata({
    pagePath: "/privacy",
    defaultTitle: "Privacy Policy | Leats",
    defaultDescription: "Learn about how we collect, use, and protect your personal data.",
    defaultKeywords: "privacy policy, data protection, personal information, privacy",
  });
}

export default async function PrivacyPage() {
  const policy = await fetchPolicy('privacy-policy');
  
  return <PolicyPage initialPolicy={policy} slug="privacy-policy" defaultTitle="Privacy Policy" />;
}
