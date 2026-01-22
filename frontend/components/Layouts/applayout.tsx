'use client';

import Header from '@/components/Home/Header';
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import Footer01 from '@/components/Home/Footer01';
import Footer02 from '@/components/Home/Footer02';
import { useAuthContext } from "@/components/providers/auth-provider";
import type { Category } from '@/services/online-services/frontendCategoryService';
import type { WebSettings, CompanySettings } from '@/services/online-services/webSettingsService';

interface PromotionalOffer {
  code: string;
  description?: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscountAmount?: number | null;
  usageType?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  userId?: string;
  categories: Category[];
  webSettings: WebSettings | null;
  companySettings: CompanySettings | null;
  promotionalOffers?: PromotionalOffer[];
}

export function AppLayout({ children, userId, categories, webSettings, companySettings, promotionalOffers = [] }: AppLayoutProps) {
  const { user, isAuthenticated } = useAuthContext();
  
  // Use user ID as key to force Header remount when auth changes
  const headerKey = user?.id || 'anonymous';
  
  return (
    <ErrorBoundary>
      <CartProvider>
        <WishlistProvider>
          <div className="min-h-screen bg-background flex flex-col">
            <Header 
              key={headerKey} 
              initialCategories={categories}
              initialWebSettings={webSettings}
              initialPromotionalOffers={promotionalOffers}
            />
            <main className="flex-1">{children}</main>
            <Footer01 
              initialWebSettings={webSettings}
              initialCompanySettings={companySettings}
            />
            <Footer02 
              initialCompanySettings={companySettings}
            />
          </div>
        </WishlistProvider>
      </CartProvider>
    </ErrorBoundary>
  );
}
