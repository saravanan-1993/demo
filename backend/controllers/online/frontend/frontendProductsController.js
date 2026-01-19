const { prisma } = require("../../../config/database");
const { getPresignedUrl } = require("../../../utils/online/uploadS3");

/**
 * Helper function to convert image keys to pre-signed URLs in variants
 */
const convertVariantImagesToUrls = async (variants) => {
  return Promise.all(
    variants.map(async (variant) => {
      if (variant.variantImages && Array.isArray(variant.variantImages)) {
        const imageUrls = await Promise.all(
          variant.variantImages.map((img) => getPresignedUrl(img, 3600))
        );
        return { ...variant, variantImages: imageUrls };
      }
      return variant;
    })
  );
};

/**
 * Check if any variant of a product falls within the price range
 */
const hasVariantInPriceRange = (product, minPrice, maxPrice) => {
  if (!product.variants || product.variants.length === 0) {
    // No variants, check default price
    const price = product.defaultSellingPrice;
    if (minPrice && price < minPrice) return false;
    if (maxPrice && price > maxPrice) return false;
    return true;
  }

  // Check if ANY variant falls within the price range
  return product.variants.some((variant) => {
    const price = variant.variantSellingPrice;
    if (minPrice && price < minPrice) return false;
    if (maxPrice && price > maxPrice) return false;
    return true;
  });
};

/**
 * Filter variants to only include those within price range
 */
const filterVariantsByPrice = (variants, minPrice, maxPrice) => {
  if (!minPrice && !maxPrice) return variants;
  
  return variants.filter((variant) => {
    const price = variant.variantSellingPrice;
    if (minPrice && price < minPrice) return false;
    if (maxPrice && price > maxPrice) return false;
    return true;
  });
};

/**
 * Get all products for frontend display
 * GET /api/online/frontend/products
 */
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      subCategory,
      brand,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "desc",
      badge,
      includeVariantPriceFilter = "true",
    } = req.query;

    console.log("[Frontend Products] Fetching products with filters:", {
      page,
      limit,
      search,
      category,
      subCategory,
      brand,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
      badge,
      includeVariantPriceFilter,
    });

    // Build where clause - only show active products
    const where = {
      productStatus: "active",
      showInProductsPage: true,
    };

    // Search in brand and description
    if (search && search.trim() !== "") {
      where.OR = [
        { brand: { contains: search.trim(), mode: "insensitive" } },
        { shortDescription: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // Filter by category and subcategory
    if (category) where.category = category;
    if (subCategory) where.subCategory = subCategory;
    if (brand) where.brand = brand;

    // Filter by badge
    if (badge && badge !== "all") {
      where.productsPageBadge = badge;
    }

    // Parse price values
    const parsedMinPrice = minPrice ? parseFloat(minPrice) : null;
    const parsedMaxPrice = maxPrice ? parseFloat(maxPrice) : null;

    // For variant-level price filtering, we need to fetch more products and filter in memory
    const useVariantPriceFilter = includeVariantPriceFilter === "true" && (parsedMinPrice || parsedMaxPrice);

    // If not using variant price filter, use default price filter at DB level
    if (!useVariantPriceFilter && (parsedMinPrice || parsedMaxPrice)) {
      where.defaultSellingPrice = {};
      if (parsedMinPrice) where.defaultSellingPrice.gte = parsedMinPrice;
      if (parsedMaxPrice) where.defaultSellingPrice.lte = parsedMaxPrice;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // If using variant price filter, fetch more products to account for filtering
    const fetchLimit = useVariantPriceFilter ? take * 3 : take;
    const fetchSkip = useVariantPriceFilter ? 0 : skip;

    // Fetch products
    let products = await prisma.onlineProduct.findMany({
      where,
      skip: fetchSkip,
      take: useVariantPriceFilter ? undefined : fetchLimit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        category: true,
        subCategory: true,
        brand: true,
        shortDescription: true,
        enableVariants: true,
        variants: true,
        cuttingStyles: true,
        hsnCode: true,
        gstPercentage: true,
        defaultMRP: true,
        defaultSellingPrice: true,
        defaultPurchasePrice: true,
        discountType: true,
        defaultDiscountValue: true,
        isCODAvailable: true,
        shippingCharge: true,
        freeShipping: true,
        totalStockQuantity: true,
        stockStatus: true,
        showOnHomepage: true,
        homepageBadge: true,
        showInProductsPage: true,
        productsPageBadge: true,
        returnPolicyApplicable: true,
        returnWindowDays: true,
        warrantyDetails: true,
        countryOfOrigin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let totalCount;

    // Apply variant-level price filtering if enabled
    if (useVariantPriceFilter) {
      products = products.filter((product) => 
        hasVariantInPriceRange(product, parsedMinPrice, parsedMaxPrice)
      );

      products = products.map((product) => ({
        ...product,
        variants: filterVariantsByPrice(product.variants, parsedMinPrice, parsedMaxPrice),
      }));

      totalCount = products.length;
      products = products.slice(skip, skip + take);
    } else {
      totalCount = await prisma.onlineProduct.count({ where });
    }

    console.log(`[Frontend Products] Found ${products.length} products out of ${totalCount} total`);

    // Get all unique cutting style IDs from products
    const allCuttingStyleIds = [...new Set(products.flatMap(p => p.cuttingStyles || []))];
    
    // Fetch cutting style details if any exist
    let cuttingStylesMap = {};
    if (allCuttingStyleIds.length > 0) {
      const cuttingStyles = await prisma.cuttingStyle.findMany({
        where: { 
          id: { in: allCuttingStyleIds },
          isActive: true 
        },
        select: { id: true, name: true },
        orderBy: { sortOrder: 'asc' }
      });
      cuttingStylesMap = Object.fromEntries(cuttingStyles.map(cs => [cs.id, cs]));
    }

    // Convert variant images to pre-signed URLs and populate cutting styles
    const productsWithUrls = await Promise.all(
      products.map(async (product) => ({
        ...product,
        variants: await convertVariantImagesToUrls(product.variants),
        cuttingStyles: (product.cuttingStyles || [])
          .map(id => cuttingStylesMap[id])
          .filter(Boolean)
      }))
    );

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: productsWithUrls,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("[Frontend Products] Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

/**
 * Get single product by ID for frontend
 * GET /api/online/frontend/products/:id
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[Frontend Products] Fetching product with ID: ${id}`);

    const product = await prisma.onlineProduct.findUnique({
      where: { id },
      select: {
        id: true,
        category: true,
        subCategory: true,
        brand: true,
        shortDescription: true,
        enableVariants: true,
        variants: true,
        cuttingStyles: true,
        hsnCode: true,
        gstPercentage: true,
        defaultMRP: true,
        defaultSellingPrice: true,
        defaultPurchasePrice: true,
        discountType: true,
        defaultDiscountValue: true,
        isCODAvailable: true,
        shippingCharge: true,
        freeShipping: true,
        totalStockQuantity: true,
        lowStockAlertLevel: true,
        stockStatus: true,
        productStatus: true,
        showOnHomepage: true,
        homepageBadge: true,
        showInProductsPage: true,
        productsPageBadge: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        expiryDate: true,
        mfgDate: true,
        batchNo: true,
        safetyInformation: true,
        returnPolicyApplicable: true,
        returnWindowDays: true,
        warrantyDetails: true,
        countryOfOrigin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product) {
      console.log(`[Frontend Products] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Only show active products to frontend users
    if (product.productStatus !== "active") {
      console.log(`[Frontend Products] Product is not active: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Product not available",
      });
    }

    // Fetch cutting style details if any exist
    let cuttingStylesData = [];
    if (product.cuttingStyles && product.cuttingStyles.length > 0) {
      const cuttingStyles = await prisma.cuttingStyle.findMany({
        where: { 
          id: { in: product.cuttingStyles },
          isActive: true 
        },
        select: { id: true, name: true },
        orderBy: { sortOrder: 'asc' }
      });
      cuttingStylesData = cuttingStyles;
    }

    // Convert variant images to pre-signed URLs
    const productWithUrls = {
      ...product,
      variants: await convertVariantImagesToUrls(product.variants),
      cuttingStyles: cuttingStylesData
    };

    console.log(`[Frontend Products] Product fetched successfully: ${id}`);

    res.json({
      success: true,
      data: productWithUrls,
    });
  } catch (error) {
    console.error("[Frontend Products] Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

/**
 * Get homepage products filtered by badge
 * GET /api/online/frontend/homepage-products
 */
const getHomepageProducts = async (req, res) => {
  try {
    const {
      badge,
      category,
      limit = 10,
    } = req.query;

    console.log("[Frontend Products] Fetching homepage products:", {
      badge,
      category,
      limit,
    });

    // Build where clause - only show active products marked for homepage
    const where = {
      productStatus: "active",
      showOnHomepage: true,
    };

    // Filter by homepage badge
    if (badge && badge !== "all") {
      where.homepageBadge = badge;
    }

    // Filter by category
    if (category && category !== "") {
      where.category = category;
    }

    // Fetch products
    const products = await prisma.onlineProduct.findMany({
      where,
      take: parseInt(limit),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        category: true,
        subCategory: true,
        brand: true,
        shortDescription: true,
        enableVariants: true,
        variants: true,
        cuttingStyles: true,
        hsnCode: true,
        gstPercentage: true,
        defaultMRP: true,
        defaultSellingPrice: true,
        defaultPurchasePrice: true,
        discountType: true,
        defaultDiscountValue: true,
        isCODAvailable: true,
        shippingCharge: true,
        freeShipping: true,
        totalStockQuantity: true,
        stockStatus: true,
        showOnHomepage: true,
        homepageBadge: true,
        showInProductsPage: true,
        productsPageBadge: true,
        returnPolicyApplicable: true,
        returnWindowDays: true,
        warrantyDetails: true,
        countryOfOrigin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`[Frontend Products] Found ${products.length} homepage products for badge: ${badge || 'all'}, category: ${category || 'all'}`);

    // Get all unique cutting style IDs from products
    const allCuttingStyleIds = [...new Set(products.flatMap(p => p.cuttingStyles || []))];
    
    // Fetch cutting style details if any exist
    let cuttingStylesMap = {};
    if (allCuttingStyleIds.length > 0) {
      const cuttingStyles = await prisma.cuttingStyle.findMany({
        where: { 
          id: { in: allCuttingStyleIds},
          isActive: true 
        },
        select: { id: true, name: true },
        orderBy: { sortOrder: 'asc' }
      });
      cuttingStylesMap = Object.fromEntries(cuttingStyles.map(cs => [cs.id, cs]));
    }

    // Convert variant images to pre-signed URLs and populate cutting styles
    const productsWithUrls = await Promise.all(
      products.map(async (product) => ({
        ...product,
        variants: await convertVariantImagesToUrls(product.variants),
        cuttingStyles: (product.cuttingStyles || [])
          .map(id => cuttingStylesMap[id])
          .filter(Boolean)
      }))
    );

    res.json({
      success: true,
      data: productsWithUrls,
      count: productsWithUrls.length,
    });
  } catch (error) {
    console.error("[Frontend Products] Error fetching homepage products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch homepage products",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

/**
 * Get frequently bought together products for frontend
 * GET /api/online/frontend/products/:id/frequently-bought-together
 */
const getFrequentlyBoughtTogether = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[Frontend Products] Fetching frequently bought together for product: ${id}`);

    // Get the main product
    const product = await prisma.onlineProduct.findUnique({
      where: { id },
      select: {
        id: true,
        productStatus: true,
        frequentlyBoughtTogether: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Only show for active products
    if (product.productStatus !== "active") {
      return res.status(404).json({
        success: false,
        message: "Product not available",
      });
    }

    if (!product.frequentlyBoughtTogether || product.frequentlyBoughtTogether.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Extract product IDs
    const addonProductIds = product.frequentlyBoughtTogether.map(item => item.productId);

    // Fetch all add-on products (only active ones)
    const addonProducts = await prisma.onlineProduct.findMany({
      where: {
        id: { in: addonProductIds },
        productStatus: "active",
      },
      select: {
        id: true,
        category: true,
        subCategory: true,
        brand: true,
        shortDescription: true,
        variants: true,
        defaultMRP: true,
        defaultSellingPrice: true,
        stockStatus: true,
      },
    });

    // Map add-on products with their configuration
    const addonsWithDetails = await Promise.all(
      product.frequentlyBoughtTogether.map(async (addon) => {
        const addonProduct = addonProducts.find(p => p.id === addon.productId);
        
        if (!addonProduct) return null;

        // Get the specific variant
        const variant = addonProduct.variants[addon.variantIndex];
        
        if (!variant) return null;

        // Check stock availability
        if (variant.variantStockQuantity <= 0) return null;

        // Convert variant images to presigned URLs
        const variantWithUrls = await convertVariantImagesToUrls([variant]);

        return {
          productId: addonProduct.id,
          variantIndex: addon.variantIndex,
          isDefaultSelected: addon.isDefaultSelected || false,
          product: {
            id: addonProduct.id,
            shortDescription: addonProduct.shortDescription,
            brand: addonProduct.brand,
            category: addonProduct.category,
            subCategory: addonProduct.subCategory,
            stockStatus: addonProduct.stockStatus,
          },
          variant: variantWithUrls[0],
        };
      })
    );

    // Filter out null values
    const validAddons = addonsWithDetails.filter(Boolean);

    console.log(`[Frontend Products] Found ${validAddons.length} valid add-ons`);

    res.json({
      success: true,
      data: validAddons,
    });
  } catch (error) {
    console.error("[Frontend Products] Error fetching frequently bought together:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch frequently bought together products",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getHomepageProducts,
  getFrequentlyBoughtTogether,
};
