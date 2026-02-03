"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  IconChevronRight,
  IconMinus,
  IconPlus,
  IconHeart,
  IconShare,
  IconTruck,
  IconShieldCheck,
  IconRefresh,
  IconBrandWhatsapp,
  IconBrandFacebook,
  IconBrandTwitter,
  IconLink,
  IconX,
} from "@tabler/icons-react";
import {
  type Product,
  type FrequentlyBoughtTogetherAddon,
} from "@/services/online-services/frontendProductService";
import { generateCategorySlug } from "@/lib/slugify";
import DynamicProductCard from "@/components/Home/DynamicProductCard";
import FrequentlyBoughtTogether from "@/components/Product/FrequentlyBoughtTogether";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";

interface ProductDetailClientProps {
  productId: string;
  initialProduct: Product;
  initialRelatedProducts: Product[];
  initialFrequentlyBoughtTogether: FrequentlyBoughtTogetherAddon[];
}

export default function ProductDetailClient({
  initialProduct,
  initialRelatedProducts,
  initialFrequentlyBoughtTogether,
}: ProductDetailClientProps) {
  const searchParams = useSearchParams();
  const variantParam = searchParams.get("variant");
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { addToCart, updateQuantity, getItemQuantity } = useCart();
  const currencySymbol = useCurrency();

  const [product] = useState<Product | null>(initialProduct);
  const [relatedProducts] = useState<Product[]>(initialRelatedProducts);
  const [frequentlyBoughtTogether] = useState<FrequentlyBoughtTogetherAddon[]>(initialFrequentlyBoughtTogether);
  const loading = false; // No loading since we have initial data
  // Initialize with 0, will be updated when product loads
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showZoom, setShowZoom] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareButtonRef = useRef<HTMLDivElement>(null);
  const initialScrollY = useRef<number>(0);

  const [selectedCuttingStyle, setSelectedCuttingStyle] = useState<string>("");

  useEffect(() => {
    if (product?.cuttingStyles && product.cuttingStyles.length > 0) {
      setSelectedCuttingStyle(product.cuttingStyles[0].name);
    }
  }, [product]);

  const isWishlisted = product ? isInWishlist(product.id) : false;

  // Set initial variant based on URL param or default
  useEffect(() => {
    if (!initialProduct) return;
    
    // Priority: URL parameter > Default variant > First variant
    if (variantParam && initialProduct.variants) {
      const variantIndex = initialProduct.variants.findIndex(
        (v) => v.inventoryProductId === variantParam
      );
      if (variantIndex !== -1) {
        setSelectedVariant(variantIndex);
        return;
      }
    }
    
    // If no URL param or not found, use default variant
    if (initialProduct.variants) {
      const defaultIndex = initialProduct.variants.findIndex(v => v.isDefault);
      if (defaultIndex >= 0) {
        setSelectedVariant(defaultIndex);
      }
    }
  }, [initialProduct, variantParam]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedVariant]);

  // Close share menu on scroll - only when scrolled significantly (150px)
  useEffect(() => {
    if (!showShareMenu) return;
    
    initialScrollY.current = window.scrollY;
    
    const handleScroll = () => {
      const scrollDiff = Math.abs(window.scrollY - initialScrollY.current);
      if (scrollDiff > 150) {
        setShowShareMenu(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showShareMenu]);

  const currentVariant = product?.variants[selectedVariant];
  const inventoryProductId = currentVariant?.inventoryProductId || "";
  const quantity = product
    ? getItemQuantity(product.id, inventoryProductId)
    : 0;
  const availableStock = currentVariant?.variantStockQuantity || 0;
  const isOutOfStock =
    availableStock <= 0 ||
    currentVariant?.variantStockStatus === "out-of-stock";
  const isLowStock =
    availableStock > 0 &&
    availableStock <= (currentVariant?.variantLowStockAlert || 5);

  const handleAddToCart = async () => {
    if (!product) return;

    if (isOutOfStock) {
      toast.error("This item is currently out of stock");
      return;
    }

    await addToCart(product, selectedVariant, selectedCuttingStyle);
  };

  const handleAddMultipleToCart = async (items: Array<{ inventoryProductId: string; quantity: number }>) => {
    try {
      // Add main product first
      const mainItem = items.find(item => item.inventoryProductId === currentVariant?.inventoryProductId);
      if (mainItem && product) {
        await addToCart(product, selectedVariant, selectedCuttingStyle);
      }

      // Add addon products
      const addonItems = items.filter(item => item.inventoryProductId !== currentVariant?.inventoryProductId);
      
      for (const addonItem of addonItems) {
        // Find the addon product details from frequentlyBoughtTogether
        const addon = frequentlyBoughtTogether.find(
          fbt => fbt.variant.inventoryProductId === addonItem.inventoryProductId
        );
        
        if (addon) {
          // Create a product object for the addon
          const addonProduct: Product = {
            ...addon.product,
            id: addon.productId,
            variants: [addon.variant],
            enableVariants: true,
          } as Product;
          
          // Add the addon product to cart
          await addToCart(addonProduct, addon.variantIndex, "");
        }
      }
    } catch (error) {
      console.error("Error adding multiple items:", error);
      throw error;
    }
  };

  const handleIncrement = () => {
    if (!product) return;

    if (quantity >= availableStock) {
      toast.warning(`Only ${availableStock} items available in stock`);
      return;
    }

    updateQuantity(product.id, inventoryProductId, quantity + 1);
  };

  const handleDecrement = () => {
    if (!product) return;

    updateQuantity(product.id, inventoryProductId, quantity - 1);
    if (quantity === 1) {
      toast.info("Item removed from cart");
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const handleMouseEnter = () => {
    setShowZoom(true);
  };

  const handleMouseLeave = () => {
    setShowZoom(false);
  };

  const handleWishlistToggle = () => {
    if (!product) return;

    if (isWishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  // Share functionality
  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return '';
  };

  const getShareText = () => {
    if (!product || !currentVariant) return '';
    const price = currentVariant.variantSellingPrice;
    return `Check out ${currentVariant.displayName || product.shortDescription} - ${currencySymbol}${price}`;
  };

  const handleShare = async (platform: string) => {
    const url = getShareUrl();
    const text = getShareText();
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank');
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          toast.success('Link copied to clipboard!');
        } catch {
          toast.error('Failed to copy link');
        }
        break;
      case 'native':
        if (navigator.share) {
          try {
            await navigator.share({
              title: currentVariant?.displayName || product?.shortDescription || 'Product',
              text: text,
              url: url,
            });
          } catch (err) {
            // User cancelled or share failed
            if ((err as Error).name !== 'AbortError') {
              toast.error('Failed to share');
            }
          }
        }
        break;
    }
    setShowShareMenu(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="bg-white rounded-lg p-3 sm:p-6 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              <div className="aspect-square bg-gray-200 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-12 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800 mb-4">
            Product Not Found
          </h1>
          <Link href="/" className="text-[#e63946] hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const price =
    currentVariant?.variantSellingPrice || product.defaultSellingPrice;
  const mrp = currentVariant?.variantMRP || product.defaultMRP;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const variantImages = currentVariant?.variantImages || [];
  const productImages =
    variantImages.length > 0 ? variantImages : ["/placeholder-product.png"];
  const currentImage = productImages[selectedImageIndex] || productImages[0];

  const getBadgeInfo = () => {
    // Only show products page badge, not homepage badge
    if (product.productsPageBadge && product.productsPageBadge !== "none")
      return { text: product.productsPageBadge, color: "bg-green-600" };
    return null;
  };
  const badge = getBadgeInfo();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm overflow-x-auto">
            <Link
              href="/"
              className="text-gray-500 hover:text-[#e63946] whitespace-nowrap"
            >
              Home
            </Link>
            <IconChevronRight
              size={14}
              className="text-gray-400 flex-shrink-0"
            />
            <Link
              href={`/category/${generateCategorySlug(product.category)}/${
                product.category
              }`}
              className="text-gray-500 hover:text-[#e63946] whitespace-nowrap"
            >
              {product.category}
            </Link>
            <IconChevronRight
              size={14}
              className="text-gray-400 flex-shrink-0"
            />
            <span className="text-gray-800 font-medium truncate">
              {currentVariant?.variantName || currentVariant?.displayName || product.shortDescription}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="bg-white rounded-lg p-3 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            {/* Image Gallery - Mobile: Main image first, thumbnails below */}
            <div className="flex flex-col lg:flex-row gap-2 sm:gap-4">
              {/* Main Image */}
              <div className="relative flex-1 order-1 lg:order-2">
                {badge && (
                  <span className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-green-600 text-white text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 rounded z-10">
                    {badge.text}
                  </span>
                )}
                <div
                  className="aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200 relative cursor-crosshair"
                  onMouseMove={handleMouseMove}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  {currentImage &&
                  currentImage !== "/placeholder-product.png" ? (
                    <>
                      <Image
                        src={currentImage}
                        alt={product.shortDescription}
                        width={500}
                        height={500}
                        className="w-full h-full object-contain p-4 sm:p-8"
                      />
                      {showZoom && (
                        <div
                          className="absolute inset-0 pointer-events-none hidden lg:block"
                          style={{
                            backgroundImage: `url(${currentImage})`,
                            backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                            backgroundSize: "200%",
                            backgroundRepeat: "no-repeat",
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image Available
                    </div>
                  )}
                </div>
              </div>
              
              {/* Thumbnails - Horizontal on mobile, vertical on desktop */}
              {productImages.length > 1 && (
                <div className="flex lg:flex-col gap-2 sm:gap-3 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden max-w-full lg:max-w-none lg:max-h-[600px] order-2 lg:order-1 pb-2 lg:pb-0">
                  {productImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImageIndex === index
                          ? "border-[#e63946] ring-2 ring-red-100"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {image && image !== "/placeholder-product.png" ? (
                        <Image
                          src={image}
                          alt={`${product.shortDescription} - Image ${
                            index + 1
                          }`}
                          width={80}
                          height={80}
                          className="w-full h-full object-contain p-1 sm:p-2 bg-gray-50"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 text-[10px]">
                          No Image
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">
                {product.brand}
              </p>
              
              {/* Product Title with Wishlist and Share buttons */}
              <div className="flex items-start justify-between gap-3 mb-2 sm:mb-3">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800 flex-1">
                  {currentVariant?.displayName || product.shortDescription}
                </h1>
                
                {/* Wishlist and Share buttons - Right side of title */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <button
                    onClick={handleWishlistToggle}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <IconHeart
                      size={20}
                      className={`sm:w-6 sm:h-6 transition-colors ${
                        isWishlisted ? "fill-red-500 text-red-500" : "text-gray-600"
                      }`}
                    />
                  </button>
                  
                  {/* Share Button with Dropdown */}
                  <div className="relative" ref={shareButtonRef}>
                    <button 
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      title="Share"
                    >
                      <IconShare size={20} className="sm:w-6 sm:h-6 text-gray-600" />
                    </button>
                    
                    {/* Share Menu - Bottom Sheet on Mobile, Dropdown on Desktop */}
                    {showShareMenu && (
                      <>
                        {/* Backdrop */}
                        <div 
                          className="fixed inset-0 z-40 bg-black/50 sm:bg-transparent" 
                          onClick={() => setShowShareMenu(false)}
                        />
                        
                        {/* Mobile: Bottom Sheet */}
                        <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
                          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
                          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-base font-semibold text-gray-800">Share via</span>
                            <button 
                              onClick={() => setShowShareMenu(false)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <IconX size={20} />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4 p-4">
                            <button
                              onClick={() => handleShare('whatsapp')}
                              className="flex flex-col items-center gap-2"
                            >
                              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                                <IconBrandWhatsapp size={24} className="text-white" />
                              </div>
                              <span className="text-xs text-gray-600">WhatsApp</span>
                            </button>
                            
                            <button
                              onClick={() => handleShare('facebook')}
                              className="flex flex-col items-center gap-2"
                            >
                              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                                <IconBrandFacebook size={24} className="text-white" />
                              </div>
                              <span className="text-xs text-gray-600">Facebook</span>
                            </button>
                            
                            <button
                              onClick={() => handleShare('twitter')}
                              className="flex flex-col items-center gap-2"
                            >
                              <div className="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center">
                                <IconBrandTwitter size={24} className="text-white" />
                              </div>
                              <span className="text-xs text-gray-600">Twitter</span>
                            </button>
                            
                            <button
                              onClick={() => handleShare('copy')}
                              className="flex flex-col items-center gap-2"
                            >
                              <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                                <IconLink size={24} className="text-white" />
                              </div>
                              <span className="text-xs text-gray-600">Copy Link</span>
                            </button>
                          </div>
                          
                          {'share' in navigator && (
                            <div className="px-4 pb-4">
                              <button
                                onClick={() => handleShare('native')}
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                              >
                                More Options
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Desktop: Dropdown Menu */}
                        <div className="hidden sm:block absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                          <button
                            onClick={() => handleShare('whatsapp')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
                          >
                            <IconBrandWhatsapp size={18} className="text-green-500" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => handleShare('facebook')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
                          >
                            <IconBrandFacebook size={18} className="text-blue-600" />
                            <span>Facebook</span>
                          </button>
                          <button
                            onClick={() => handleShare('twitter')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
                          >
                            <IconBrandTwitter size={18} className="text-sky-500" />
                            <span>Twitter</span>
                          </button>
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={() => handleShare('copy')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
                          >
                            <IconLink size={18} className="text-gray-600" />
                            <span>Copy Link</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
             
              <div className="mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {currencySymbol}
                    {price.toFixed(0)}
                  </span>
                  {discount > 0 && (
                    <>
                      <span className="text-base sm:text-lg text-gray-400 line-through">
                        {currencySymbol}
                        {mrp.toFixed(0)}
                      </span>
                      <span className="bg-green-100 text-green-700 text-xs sm:text-sm px-2 py-0.5 rounded font-medium">
                        {discount}% OFF
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  (Inclusive of all taxes)
                </p>
              </div>

              {product.enableVariants && product.variants.length > 1 && (
                <div className="mb-4 sm:mb-6">
                  <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Select Variant
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant, index) => {
                      const variantDiscount =
                        variant.variantMRP > variant.variantSellingPrice
                          ? Math.round(
                              ((variant.variantMRP -
                                variant.variantSellingPrice) /
                                variant.variantMRP) *
                                100
                            )
                          : 0;
                      const variantOutOfStock =
                        variant.variantStockQuantity <= 0 ||
                        variant.variantStockStatus === "out-of-stock";
                      const variantInactive = variant.variantStatus === "inactive";
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedVariant(index)}
                          disabled={variantInactive}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 text-xs sm:text-sm font-medium transition-colors ${
                            selectedVariant === index
                              ? variantInactive
                                ? "border-gray-400 bg-gray-100 text-gray-500"
                                : variantOutOfStock
                                ? "border-red-400 bg-red-50 text-red-600"
                                : "border-[#e63946] bg-red-50 text-[#e63946]"
                              : variantInactive
                              ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                              : variantOutOfStock
                              ? "border-gray-200 bg-gray-50 text-gray-500 hover:border-red-300"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <span className="block">{variant.dropdownName || variant.displayName || variant.variantName}</span>
                          <span className="block text-[10px] sm:text-xs mt-0.5">
                            {variantInactive ? (
                              <span className="text-gray-500">Unavailable</span>
                            ) : variantOutOfStock ? (
                              <span className="text-red-500">Out of Stock</span>
                            ) : (
                              <>
                                {currencySymbol}
                                {variant.variantSellingPrice}
                                {variantDiscount > 0 && (
                                  <span className="ml-1 text-green-600">
                                    ({variantDiscount}% off)
                                  </span>
                                )}
                              </>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {product.cuttingStyles && product.cuttingStyles.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Select Cutting Style
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.cuttingStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedCuttingStyle(style.name)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 text-xs sm:text-sm font-medium transition-colors ${
                          selectedCuttingStyle === style.name
                            ? "border-[#e63946] bg-red-50 text-[#e63946]"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                {quantity === 0 ? (
                  <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className="w-full sm:flex-1 bg-[#e63946] text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium hover:bg-[#c1121f] transition-colors text-sm sm:text-base disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                  </button>
                ) : (
                  <>
                    <div className="flex items-center justify-center border-2 border-[#e63946] rounded-lg">
                      <button
                        onClick={handleDecrement}
                        className="px-3 sm:px-4 py-2 text-[#e63946] hover:bg-red-50 transition-colors"
                      >
                        <IconMinus
                          size={16}
                          className="sm:w-[18px] sm:h-[18px]"
                        />
                      </button>
                      <span className="px-4 sm:px-6 py-2 font-semibold border-x-2 border-[#e63946] text-[#e63946]">
                        {quantity}
                      </span>
                      <button
                        onClick={handleIncrement}
                        disabled={quantity >= availableStock}
                        className="px-3 sm:px-4 py-2 text-[#e63946] hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <IconPlus
                          size={16}
                          className="sm:w-[18px] sm:h-[18px]"
                        />
                      </button>
                    </div>
                    <div className="flex-1 bg-green-50 border-2 border-green-500 text-green-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium text-center text-sm sm:text-base">
                      ✓ Added - {currencySymbol}
                      {(price * quantity).toFixed(0)}
                      {quantity >= availableStock && (
                        <span className="block text-xs text-orange-600 mt-1">
                          Max stock reached
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <IconTruck
                      size={20}
                      className="text-[#e63946] flex-shrink-0 sm:w-6 sm:h-6"
                    />
                    <div>
                      <p className="text-xs sm:text-sm font-medium">
                        {product.freeShipping
                          ? "Free Delivery"
                          : `Delivery ${currencySymbol}${product.shippingCharge}`}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {product.freeShipping
                          ? "On this product"
                          : "Shipping charges apply"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <IconShieldCheck
                      size={20}
                      className="text-[#e63946] flex-shrink-0 sm:w-6 sm:h-6"
                    />
                    <div>
                      <p className="text-xs sm:text-sm font-medium">
                        100% Genuine
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        Quality assured
                      </p>
                    </div>
                  </div>
                  {product.returnPolicyApplicable && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <IconRefresh
                        size={20}
                        className="text-[#e63946] flex-shrink-0 sm:w-6 sm:h-6"
                      />
                      <div>
                        <p className="text-xs sm:text-sm font-medium">
                          Easy Returns
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          {product.returnWindowDays} days return
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Frequently Bought Together Section - Below Delivery Icons */}
              {frequentlyBoughtTogether.length > 0 && currentVariant && (
                <div className="mt-4 sm:mt-6">
                  <FrequentlyBoughtTogether
                    mainProduct={{
                      id: product.id,
                      name: currentVariant.displayName || product.shortDescription,
                      price: price,
                      mrp: mrp,
                      image: currentImage,
                      inventoryProductId: inventoryProductId,
                      variantIndex: selectedVariant,
                    }}
                    addons={frequentlyBoughtTogether}
                    onAddToCart={handleAddMultipleToCart}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Information Section - Professional E-commerce Style */}
        <div className="bg-white rounded-lg mb-4 sm:mb-6">
          {/* Product Description */}
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
              Product Description
            </h2>
            <div className="text-sm sm:text-base text-gray-600 leading-relaxed whitespace-pre-line">
              {currentVariant?.detailedDescription || product.shortDescription}
            </div>
          </div>

          {/* Product Specifications - Dynamic based on available data */}
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
              Product Specifications
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500 w-1/3 sm:w-1/4">Brand</td>
                    <td className="py-2.5 sm:py-3 text-gray-800 font-medium">{product.brand}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500">Category</td>
                    <td className="py-2.5 sm:py-3 text-gray-800">{product.category}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500">Sub Category</td>
                    <td className="py-2.5 sm:py-3 text-gray-800">{product.subCategory}</td>
                  </tr>
                  {currentVariant?.variantColour && (<tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500">Colour</td>
                    <td className="py-2.5 sm:py-3 text-gray-800">{currentVariant.variantColour}</td>
                  </tr>)}
                  {currentVariant?.variantSize && (<tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500">Size</td>
                    <td className="py-2.5 sm:py-3 text-gray-800">{currentVariant.variantSize}</td>
                  </tr>)}
                  {currentVariant?.variantMaterial && (<tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500">Material</td>
                    <td className="py-2.5 sm:py-3 text-gray-800">{currentVariant.variantMaterial}</td>
                  </tr>)}
                  {(currentVariant?.variantWeight ?? 0) > 0 && (<tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500">Weight</td>
                    <td className="py-2.5 sm:py-3 text-gray-800">{currentVariant?.variantWeight} g</td>
                  </tr>)}
                  {(currentVariant?.variantLength || currentVariant?.variantWidth || currentVariant?.variantHeight) && (<tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500">Dimensions (L×W×H)</td>
                    <td className="py-2.5 sm:py-3 text-gray-800">
                      {currentVariant.variantLength || '-'} × {currentVariant.variantWidth || '-'} × {currentVariant.variantHeight || '-'} cm
                    </td>
                  </tr>)}
                  {currentVariant?.customAttributes && currentVariant.customAttributes.filter(attr => attr.key && attr.value).map((attr, index) => (<tr key={`custom-${index}`}>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500">{attr.key}</td>
                    <td className="py-2.5 sm:py-3 text-gray-800">{attr.value}</td>
                  </tr>))}
                  {currentVariant?.variantSKU && (<tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500">SKU</td>
                    <td className="py-2.5 sm:py-3 text-gray-800 font-mono text-xs">{currentVariant.variantSKU}</td>
                  </tr>)}
                  {(currentVariant?.variantHSN || product.hsnCode) && (<tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500">HSN Code</td>
                    <td className="py-2.5 sm:py-3 text-gray-800">{currentVariant?.variantHSN || product.hsnCode}</td>
                  </tr>)}
                  <tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500">Country of Origin</td>
                    <td className="py-2.5 sm:py-3 text-gray-800">{product.countryOfOrigin}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Manufacturing & Expiry Info (if available) */}
          {(product.mfgDate || product.expiryDate || product.batchNo) && (
            <div className="p-4 sm:p-6 border-b">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
                Manufacturing Information
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {product.batchNo && (<tr>
                      <td className="py-2.5 sm:py-3 pr-4 text-gray-500 w-1/3 sm:w-1/4">Batch No.</td>
                      <td className="py-2.5 sm:py-3 text-gray-800">{product.batchNo}</td>
                    </tr>)}
                    {product.mfgDate && (<tr>
                      <td className="py-2.5 sm:py-3 pr-4 text-gray-500">Mfg. Date</td>
                      <td className="py-2.5 sm:py-3 text-gray-800">
                        {new Date(product.mfgDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>)}
                    {product.expiryDate && (<tr>
                      <td className="py-2.5 sm:py-3 pr-4 text-gray-500">Expiry Date</td>
                      <td className="py-2.5 sm:py-3 text-gray-800">
                        {new Date(product.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Safety Information (if available) */}
          {product.safetyInformation && (
            <div className="p-4 sm:p-6 border-b">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Safety Information
              </h2>
              <div className="text-sm sm:text-base text-gray-700 leading-relaxed bg-white p-3 sm:p-4 rounded-lg border border-gray-200 whitespace-pre-line">
                {product.safetyInformation}
              </div>
            </div>
          )}

          {/* Shipping & Returns */}
          <div className="p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
              Shipping & Returns
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500 w-1/3 sm:w-1/4">Shipping</td>
                    <td className="py-2.5 sm:py-3 text-gray-800">
                      {product.freeShipping ? (
                        <span className="text-green-600 font-medium">Free Shipping</span>
                      ) : (
                        <span>{currencySymbol}{product.shippingCharge}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500">Cash on Delivery</td>
                    <td className="py-2.5 sm:py-3 text-gray-800">
                      {product.isCODAvailable ? (
                        <span className="text-green-600">Available</span>
                      ) : (
                        <span className="text-gray-500">Not Available</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 sm:py-3 pr-4 text-gray-500">Return Policy</td>
                    <td className="py-2.5 sm:py-3 text-gray-800">
                      {product.returnPolicyApplicable ? (
                        <span className="text-green-600">{product.returnWindowDays} days easy return</span>
                      ) : (
                        <span className="text-gray-500">Not applicable</span>
                      )}
                    </td>
                  </tr>
                  {product.warrantyDetails && (
                    <tr>
                      <td className="py-2.5 sm:py-3 pr-4 text-gray-500">Warranty</td>
                      <td className="py-2.5 sm:py-3 text-gray-800">{product.warrantyDetails}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
              Similar Products
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
              {relatedProducts.map((p) => (
                <DynamicProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
