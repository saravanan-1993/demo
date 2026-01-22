import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo';
import ContactSection from '@/components/Contact/ContactSection';
import { fetchCompanySettings } from '@/lib/server-fetch';

export async function generateMetadata() {
  return await generatePageMetadata({
    pagePath: "/contact",
    defaultTitle: "Contact Us | Leats - Fresh Groceries & Daily Essentials",
    defaultDescription: "Get in touch with Leats customer support. We're here to help with your orders, deliveries, and any questions you may have.",
    defaultKeywords: "contact leats, customer support, help, contact information, grocery delivery support",
  });
}

export default async function ContactPage() {
  // Fetch company settings on server-side
  const companySettings = await fetchCompanySettings();

  return (
    <div className=" bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Link href="/" className="text-[#E63946] hover:underline">Home</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-800 font-medium">Contact Us</span>
          </div>
        </div>
      </div>

      <ContactSection initialCompanySettings={companySettings} />
    </div>
  );
}
