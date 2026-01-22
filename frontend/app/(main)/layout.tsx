import { AppLayout } from "@/components/Layouts/applayout";
import { Toaster } from "@/components/ui/sonner";
import { fetchCategories, fetchWebSettings, fetchCompanySettings, fetchPromotionalCoupons } from "@/lib/server-fetch";

// Force dynamic rendering for all pages in this layout
export const dynamic = 'force-dynamic';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch data for Header and Footer on server-side
  const [categories, webSettings, companySettings, promotionalOffers] = await Promise.all([
    fetchCategories(),
    fetchWebSettings(),
    fetchCompanySettings(),
    fetchPromotionalCoupons(),
  ]);

  return (
    <AppLayout
      categories={categories}
      webSettings={webSettings}
      companySettings={companySettings}
      promotionalOffers={promotionalOffers}
    >
      <Toaster 
        position="top-center"
        toastOptions={{
          className: "border-2 border-border shadow-xl rounded-lg text-lg",
          duration: 4000,
          style: {
            background: "var(--background)",
            color: "var(--foreground)",
            boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
            padding: "20px 24px",
            minWidth: "400px",
            maxWidth: "600px",
          },
        }}
        richColors
        expand
        gap={12}
      />
      {children}
    </AppLayout>
  )
}
