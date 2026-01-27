"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  User as UserIcon,
  Settings,
  LogOut,
  Bell,
  HomeIcon,
} from "lucide-react";
import { LogoutAlert } from "@/components/ui/logout-alert";
import { useAuth } from "@/hooks/useAuth";

// Route mapping for breadcrumbs
const routeMap: Record<string, { title: string; parent?: string }> = {
  // Dashboard
  "/dashboard": { title: "Dashboard" },

  // Products List
  "/dashboard/products-list": {
    title: "Products",
    parent: "/dashboard",
  },
  "/dashboard/products-list/online": {
    title: "Online Products",
    parent: "/dashboard/products-list",
  },
  "/dashboard/products-list/online/add-product": {
    title: "Add Product",
    parent: "/dashboard/products-list/online",
  },
  "/dashboard/products-list/online/edit": {
    title: "Edit Product",
    parent: "/dashboard/products-list/online",
  },
  "/dashboard/products-list/online/view": {
    title: "View Product",
    parent: "/dashboard/products-list/online",
  },
  "/dashboard/products-list/offline": {
    title: "Offline Products",
    parent: "/dashboard/products-list",
  },
  "/dashboard/products-list/category-list": {
    title: "Categories",
    parent: "/dashboard/products-list",
  },
  "/dashboard/products-list/category-list/add-category": {
    title: "Add Category",
    parent: "/dashboard/products-list/category-list",
  },
  "/dashboard/products-list/category-list/view": {
    title: "View Category",
    parent: "/dashboard/products-list/category-list",
  },

  // Coupons
  "/dashboard/coupons": { title: "Coupons", parent: "/dashboard" },

  // Inventory Management
  "/dashboard/inventory-management": {
    title: "Inventory",
    parent: "/dashboard",
  },
  "/dashboard/inventory-management/warehouse": {
    title: "Warehouse",
    parent: "/dashboard/inventory-management",
  },
  "/dashboard/inventory-management/stock-adjustment": {
    title: "Stock Adjustment",
    parent: "/dashboard/inventory-management",
  },
  "/dashboard/inventory-management/stock-adjustment/adjustment": {
    title: "Adjustment",
    parent: "/dashboard/inventory-management/stock-adjustment",
  },
  "/dashboard/inventory-management/reports": {
    title: "Reports",
    parent: "/dashboard/inventory-management",
  },

  // Purchase Orders
  "/dashboard/purchase-orders": {
    title: "Purchase",
    parent: "/dashboard",
  },
  "/dashboard/purchase-orders/suppliers-list": {
    title: "Suppliers",
    parent: "/dashboard/purchase-orders",
  },
  "/dashboard/purchase-orders/purchases-list": {
    title: "Purchase Orders",
    parent: "/dashboard/purchase-orders",
  },
  "/dashboard/purchase-orders/purchases-list/view": {
    title: "View Purchase Order",
    parent: "/dashboard/purchase-orders/purchases-list",
  },
  "/dashboard/purchase-orders/bills-list": {
    title: "Bills",
    parent: "/dashboard/purchase-orders",
  },
  "/dashboard/purchase-orders/bills-list/view": {
    title: "View Bill",
    parent: "/dashboard/purchase-orders/bills-list",
  },
  "/dashboard/purchase-orders/expenses-list": {
    title: "Expenses",
    parent: "/dashboard/purchase-orders",
  },
  "/dashboard/purchase-orders/reports": {
    title: "Reports",
    parent: "/dashboard/purchase-orders",
  },

  // POS
  "/dashboard/pos": { title: "POS", parent: "/dashboard" },
  "/dashboard/pos/products": { title: "Products", parent: "/dashboard/pos" },
  "/dashboard/pos/products/edit": {
    title: "Edit Product",
    parent: "/dashboard/pos/products",
  },

  // Customer Management
  "/dashboard/customer-management": {
    title: "Customers",
    parent: "/dashboard",
  },
  "/dashboard/customer-management/view": {
    title: "View Customer",
    parent: "/dashboard/customer-management",
  },

  // Delivery Partner
  "/dashboard/delivery-partner": {
    title: "Delivery Partners",
    parent: "/dashboard",
  },
  "/dashboard/delivery-partner/all": {
    title: "All Partners",
    parent: "/dashboard/delivery-partner",
  },
  "/dashboard/delivery-partner/pending": {
    title: "Pending",
    parent: "/dashboard/delivery-partner",
  },
  "/dashboard/delivery-partner/verified": {
    title: "Verified",
    parent: "/dashboard/delivery-partner",
  },
  "/dashboard/delivery-partner/approved": {
    title: "Approved",
    parent: "/dashboard/delivery-partner",
  },
  "/dashboard/delivery-partner/rejected": {
    title: "Rejected",
    parent: "/dashboard/delivery-partner",
  },
  "/dashboard/delivery-partner/new": {
    title: "New Application",
    parent: "/dashboard/delivery-partner",
  },
  "/dashboard/delivery-partner/manage": {
    title: "Manage",
    parent: "/dashboard/delivery-partner",
  },
  "/dashboard/delivery-partner/profile": {
    title: "Profile",
    parent: "/dashboard/delivery-partner",
  },
  "/dashboard/delivery-partner/edit": {
    title: "Edit Partner",
    parent: "/dashboard/delivery-partner",
  },

  // Orders
  "/dashboard/orders": { title: "Orders", parent: "/dashboard" },
  "/dashboard/orders/online": {
    title: "Online Orders",
    parent: "/dashboard/orders",
  },
  "/dashboard/orders/pos": { 
    title: "POS Orders", 
    parent: "/dashboard/orders" 
  },

  // Finances
  "/dashboard/finances": { title: "Finances", parent: "/dashboard" },
  "/dashboard/finances/sales": {
    title: "Sales",
    parent: "/dashboard/finances",
  },
  "/dashboard/finances/sales/online-sales": {
    title: "Online Sales",
    parent: "/dashboard/finances/sales",
  },
  "/dashboard/finances/sales/pos-sales": {
    title: "POS Sales",
    parent: "/dashboard/finances/sales",
  },
  "/dashboard/finances/sales/reports": {
    title: "Reports",
    parent: "/dashboard/finances/sales",
  },
  "/dashboard/finances/transactions": {
    title: "Transactions",
    parent: "/dashboard/finances",
  },

  // Web Settings
  "/dashboard/web-settings": {
    title: "Web Settings",
    parent: "/dashboard",
  },
  "/dashboard/web-settings/logo": {
    title: "Logo & Favicon",
    parent: "/dashboard/web-settings",
  },
  "/dashboard/web-settings/banner": {
    title: "Banners",
    parent: "/dashboard/web-settings",
  },
  "/dashboard/web-settings/company": {
    title: "Company Info",
    parent: "/dashboard/web-settings",
  },
  "/dashboard/web-settings/seo": {
    title: "SEO",
    parent: "/dashboard/web-settings",
  },
  "/dashboard/web-settings/policies": {
    title: "Policies",
    parent: "/dashboard/web-settings",
  },

  // Settings
  "/dashboard/settings": { title: "Settings", parent: "/dashboard" },
  "/dashboard/settings/general": {
    title: "General",
    parent: "/dashboard/settings",
  },
  "/dashboard/settings/email-configuration": {
    title: "Email Configuration",
    parent: "/dashboard/settings",
  },
  "/dashboard/settings/payment-gateway": {
    title: "Payment Gateway",
    parent: "/dashboard/settings",
  },
  "/dashboard/settings/invoice": {
    title: "Invoice",
    parent: "/dashboard/settings",
  },
  "/dashboard/settings/gst": {
    title: "GST / Tax",
    parent: "/dashboard/settings",
  },
};

// User data will be loaded from localStorage

function generateBreadcrumbs(pathname: string) {
  const pathSegments = pathname.split("/").filter(Boolean);
  const pathChain = [];

  // Always start with Dashboard if we're in a sub-route
  if (pathSegments.length > 0 && pathSegments[0] !== "dashboard") {
    pathChain.push({
      title: "Dashboard",
      href: "/dashboard",
      isLast: false,
    });
  }

  // Build breadcrumb chain
  let processedPath = "";
  for (const segment of pathSegments) {
    processedPath += `/${segment}`;

    if (routeMap[processedPath]) {
      const route = routeMap[processedPath];
      pathChain.push({
        title: route.title,
        href: processedPath,
        isLast: processedPath === pathname,
      });
    }
  }

  return pathChain;
}

export function DashboardNavbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [logoutTimeoutId, setLogoutTimeoutId] = useState<NodeJS.Timeout | null>(
    null
  );
  const breadcrumbs = generateBreadcrumbs(pathname);

  const handleLogoutClick = () => {
    // Clear any existing timeout
    if (logoutTimeoutId) {
      clearTimeout(logoutTimeoutId);
      setLogoutTimeoutId(null);
    }
    setShowLogoutAlert(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      // Add 1 second delay before closing alert and redirecting
      const timeoutId = setTimeout(() => {
        setShowLogoutAlert(false);
        setLogoutTimeoutId(null);
      }, 1000);
      setLogoutTimeoutId(timeoutId);
    } catch (error) {
      console.error("Logout failed:", error);
      // Keep the alert open on error
    }
  };

  const handleModalChange = (open: boolean) => {
    if (!open) {
      // Clear any pending timeout when modal is closed
      if (logoutTimeoutId) {
        clearTimeout(logoutTimeoutId);
        setLogoutTimeoutId(null);
      }
    }
    setShowLogoutAlert(open);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (logoutTimeoutId) {
        clearTimeout(logoutTimeoutId);
      }
    };
  }, [logoutTimeoutId]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex items-center gap-3 px-4 flex-1">
        <SidebarTrigger className="-ml-1 hover:bg-accent/80 transition-colors" />
        <Separator orientation="vertical" className="mr-2 h-5 bg-border/60" />

        {/* Dynamic Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb, index) => (
              <div
                key={`breadcrumb-${index}-${breadcrumb.href}`}
                className="flex items-center"
              >
                {index > 0 && (
                  <BreadcrumbSeparator className="mx-2 text-muted-foreground/60">
                    /
                  </BreadcrumbSeparator>
                )}
                <BreadcrumbItem>
                  {breadcrumb.isLast ? (
                    <BreadcrumbPage className="font-semibold text-foreground bg-primary/5 px-2 py-1 rounded-md">
                      {breadcrumb.title}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        href={breadcrumb.href}
                        className="text-muted-foreground hover:text-foreground hover:bg-accent/50 px-2 py-1 rounded-md transition-all duration-150 font-medium"
                      >
                        {breadcrumb.title}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right side - Mode Toggle and User Menu */}
      <div className="flex items-center gap-2 px-4">
        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 relative hover:bg-accent/80 transition-colors rounded-lg"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-background"></span>
        </Button>

        {/* User Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-accent/80 transition-colors">
              <Avatar className="h-9 w-9 ring-2 ring-primary/10 hover:ring-primary/20 transition-all">
                <AvatarImage src={user?.image} alt={user?.name} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                  {user?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 rounded-xl shadow-lg border-border/50" align="end" forceMount>
            <DropdownMenuLabel className="font-normal p-3 bg-accent/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarImage src={user?.image} alt={user?.name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                    {user?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1 flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-none truncate">
                    {user?.name || "Loading..."}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user?.email || ""}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-1">
              <DropdownMenuItem className="cursor-pointer rounded-lg hover:bg-accent/80 transition-colors" asChild>
                <Link 
                  href="/"
                  onClick={() => {
                    // Trigger auth refresh for the main layout
                    setTimeout(() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('auth-refresh'));
                      }
                    }, 100);
                  }}
                >
                  <HomeIcon className="mr-2 h-4 w-4 text-primary" />
                  <span>Home</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer rounded-lg hover:bg-accent/80 transition-colors">
                <UserIcon className="mr-2 h-4 w-4 text-primary" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer rounded-lg hover:bg-accent/80 transition-colors" asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4 text-primary" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <div className="p-1">
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                onClick={handleLogoutClick}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span className="font-medium">Log out</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Logout Confirmation Alert */}
      <LogoutAlert
        open={showLogoutAlert}
        onOpenChange={handleModalChange}
        onConfirm={handleLogoutConfirm}
        userName={user?.name}
      />
    </header>
  );
}
