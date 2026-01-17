'use client';

import Header from '@/components/Home/Header';
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import Footer01 from '@/components/Home/Footer01';
import Footer02 from '@/components/Home/Footer02';
import { useAuthContext } from "@/components/providers/auth-provider";

interface AppLayoutProps {
  children: React.ReactNode;
  userId?: string;
}

export function AppLayout({ children, userId }: AppLayoutProps) {
  const { user, isAuthenticated } = useAuthContext();
  
  // Use user ID as key to force Header remount when auth changes
  const headerKey = user?.id || 'anonymous';
  
  return (
    <ErrorBoundary>
      <CartProvider>
        <WishlistProvider>
          <div className="min-h-screen bg-background flex flex-col">
            <Header key={headerKey} />
            <main className="flex-1">{children}</main>
            <Footer01 />
            <Footer02 />
          </div>
        </WishlistProvider>
      </CartProvider>
    </ErrorBoundary>
  );
}
