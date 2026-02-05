const { prisma } = require("../../config/database");
const {  uploadToS3 } = require("../../utils/online/uploadS3");
const { getProxyImageUrl } = require("../../utils/common/imageProxy");

/**
 * Helper function to extract S3 key from a presigned URL or return the key as-is
 * This handles both presigned URLs and raw S3 keys
 */
const extractS3Key = (urlOrKey) => {
  if (!urlOrKey || typeof urlOrKey !== 'string') return null;
  
  // If it's already just a key (no http), return as-is
  if (!urlOrKey.startsWith('http://') && !urlOrKey.startsWith('https://')) {
    return urlOrKey;
  }
  
  // Extract key from S3 URL (handles both presigned and regular S3 URLs)
  // Pattern: https://bucket.s3.region.amazonaws.com/key?query-params
  const s3Pattern = /https?:\/\/[^\/]+\.s3\.[^\/]+\.amazonaws\.com\/([^?]+)/;
  const match = urlOrKey.match(s3Pattern);
  
  if (match && match[1]) {
    return decodeURIComponent(match[1]); // Decode URL-encoded characters
  }
  
  // If not an S3 URL, return as-is (might be external URL)
  return urlOrKey;
};

/**
 * Helper function to process variant images before saving
 * Converts presigned URLs to S3 keys for storage
 */
const processVariantImagesForStorage = (variants) => {
  return variants.map((variant) => {
    if (variant.variantImages && Array.isArray(variant.variantImages)) {
      const processedImages = variant.variantImages
        .map((img) => {
          // Skip File objects (they're handled separately via upload)
          if (typeof img !== 'string') return null;
          // Skip empty strings
          if (!img || img.trim() === '') return null;
          // Extract S3 key from presigned URL
          return extractS3Key(img);
        })
        .filter(Boolean); // Remove nulls
      
      return { ...variant, variantImages: processedImages };
    }
    return variant;
  });
};

/**
 * Helper function to convert image keys to proxy URLs in variants
 */
const convertVariantImagesToUrls = (variants) => {
  return variants.map((variant) => {
    if (variant.variantImages && Array.isArray(variant.variantImages)) {
      const imageUrls = variant.variantImages
        .map((img) => getProxyImageUrl(img))
        .filter(Boolean); // Remove nulls
      return { ...variant, variantImages: imageUrls };
    }
    return variant;
  });
};

/**
 * Get all online products
 * GET /api/online/online-products
 */
const getAllOnlineProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      subCategory,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build where clause
    const where = {};

    if (search && search.trim() !== "") {
      where.OR = [
        { brand: { contains: search.trim(), mode: "insensitive" } },
        { shortDescription: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    if (category) where.category = category;
    if (subCategory) where.subCategory = subCategory;
    if (status) where.productStatus = status;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Fetch products with pagination
    const [products, totalCount] = await Promise.all([
      prisma.onlineProduct.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.onlineProduct.count({ where }),
    ]);

    // Convert variant images to proxy URLs and format default image
    const productsWithUrls = products.map((product) => ({
      ...product,
      variants: convertVariantImagesToUrls(product.variants),
    }));

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
    console.error("Error fetching online products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch online products",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

/**
 * Get online product by ID
 * GET /api/online/online-products/:id
 */
const getOnlineProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.onlineProduct.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Convert variant images to proxy URLs and format default image
    const productWithUrls = {
      ...product,
      variants: convertVariantImagesToUrls(product.variants),
    };

    res.json({
      success: true,
      data: productWithUrls,
    });
  } catch (error) {
    console.error("Error fetching online product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch online product",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

/**
 * Create online product
 * POST /api/online/online-products
 */
const createOnlineProduct = async (req, res) => {
  try {
    console.log("📦 Creating online product...");
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Files received:", req.files ? req.files.length : 0);
    
    // Parse product data from FormData
    let productData;
    if (req.body.productData) {
      // Data sent as FormData with productData field
      productData = typeof req.body.productData === 'string' 
        ? JSON.parse(req.body.productData) 
        : req.body.productData;
    } else {
      // Data sent as regular JSON
      productData = req.body;
    }

    // Validation
    if (!productData.category) {
      console.log("❌ Validation failed: Missing category");
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!productData.variants || productData.variants.length === 0) {
      console.log("❌ Validation failed: No variants provided");
      return res.status(400).json({
        success: false,
        message: "At least one variant is required",
      });
    }

    // 🔒 CRITICAL: Check for duplicate SKUs within variants
    const skuSet = new Set();
    const duplicateSKUs = [];
    
    productData.variants.forEach((variant, index) => {
      const sku = variant.variantSKU;
      if (sku && sku.trim() !== "") {
        if (skuSet.has(sku)) {
          duplicateSKUs.push({ sku, variantIndex: index + 1 });
        } else {
          skuSet.add(sku);
        }
      }
    });

    if (duplicateSKUs.length > 0) {
      console.log("❌ Validation failed: Duplicate SKUs detected:", duplicateSKUs);
      return res.status(400).json({
        success: false,
        message: "Duplicate SKUs detected in variants",
        details: `The following SKUs are used multiple times: ${duplicateSKUs.map(d => `${d.sku} (Variant ${d.variantIndex})`).join(", ")}. Each variant must have a unique SKU.`,
        duplicates: duplicateSKUs,
      });
    }

    // 🔒 SECURITY: Verify stock quantities don't exceed inventory limits
    for (const variant of productData.variants) {
      if (variant.variantStockQuantity && variant.variantStockQuantity > 1000000) {
        console.log("❌ Validation failed: Unrealistic stock quantity");
        return res.status(400).json({
          success: false,
          message: "Stock quantity exceeds maximum allowed limit (1,000,000 units)",
        });
      }
    }

    console.log("✅ Validation passed, uploading images to S3...");

    // Upload all images to S3
    if (req.files && req.files.length > 0) {
      console.log(`📸 Uploading ${req.files.length} images to S3...`);
      const uploadedImageKeys = await Promise.all(
        req.files.map((file) => uploadToS3(file.buffer, file.originalname, file.mimetype))
      );
      console.log("✅ Images uploaded to S3:", uploadedImageKeys);
      
      // Map uploaded images back to variants based on fieldname
      // Fieldname format: "variant_0_image_0", "variant_0_image_1", etc.
      req.files.forEach((file, index) => {
        const key = uploadedImageKeys[index];
        if (file.fieldname && file.fieldname.startsWith('variant_')) {
          const parts = file.fieldname.split('_');
          const variantIndex = parseInt(parts[1]);
          const imageIndex = parseInt(parts[3]);
          
          if (productData.variants[variantIndex]) {
            if (!productData.variants[variantIndex].variantImages) {
              productData.variants[variantIndex].variantImages = [];
            }
            productData.variants[variantIndex].variantImages[imageIndex] = key;
          }
        }
      });
    }

    console.log("✅ Preparing data for database...");
    
    // Process variants: add stock status and ensure low stock alert is set
    const processedVariants = processVariantImagesForStorage(productData.variants).map((variant) => {
      const variantLowStockAlert = variant.variantLowStockAlert || 10;
      const variantStockQuantity = variant.variantStockQuantity || 0;
      
      // Calculate variant-level stock status
      let variantStockStatus;
      if (variantStockQuantity === 0) {
        variantStockStatus = "out-of-stock";
      } else if (variantStockQuantity <= variantLowStockAlert) {
        variantStockStatus = "low-stock";
      } else {
        variantStockStatus = "in-stock";
      }
      
      return {
        ...variant,
        variantLowStockAlert,
        variantStockStatus
      };
    });
    
    // Prepare data with proper types and defaults
    const preparedData = {
      // Basic Details
      category: productData.category,
      subCategory: productData.subCategory || "",
      brand: productData.brand || "",
      shortDescription: productData.shortDescription || "",

      // Variants
      enableVariants: Boolean(productData.enableVariants),
      variants: processedVariants,

      // Pricing & Tax
      hsnCode: productData.hsnCode || "",
      gstPercentage: parseFloat(productData.gstPercentage) || 0,
      defaultMRP: parseFloat(productData.defaultMRP) || 0,
      defaultSellingPrice: parseFloat(productData.defaultSellingPrice) || 0,
      defaultPurchasePrice: parseFloat(productData.defaultPurchasePrice) || 0,
      discountType: productData.discountType || "Percent",
      defaultDiscountValue: parseFloat(productData.defaultDiscountValue) || 0,
      isCODAvailable: Boolean(productData.isCODAvailable ?? true),
      shippingCharge: parseFloat(productData.shippingCharge) || 0,
      freeShipping: Boolean(productData.freeShipping ?? false),

      // Visibility & SEO
      productStatus: productData.productStatus || "draft",
      showOnHomepage: Boolean(productData.showOnHomepage ?? false),
      homepageBadge: productData.homepageBadge || "none",
      showInProductsPage: Boolean(productData.showInProductsPage ?? true),
      productsPageBadge: productData.productsPageBadge || "none",
      metaTitle: productData.metaTitle || null,
      metaDescription: productData.metaDescription || null,
      metaKeywords: productData.metaKeywords || null,

      // Compliance
      expiryDate: productData.expiryDate ? new Date(productData.expiryDate) : null,
      mfgDate: productData.mfgDate ? new Date(productData.mfgDate) : null,
      batchNo: productData.batchNo || null,
      safetyInformation: productData.safetyInformation || null,

      // Additional Fields
      returnPolicyApplicable: Boolean(productData.returnPolicyApplicable ?? true),
      returnWindowDays: parseInt(productData.returnWindowDays) || 7,
      warrantyDetails: productData.warrantyDetails || null,
      countryOfOrigin: productData.countryOfOrigin || "India",

      // Cutting Styles
      cuttingStyles: Array.isArray(productData.cuttingStyles) ? productData.cuttingStyles : [],

      // Frequently Bought Together
      frequentlyBoughtTogether: Array.isArray(productData.frequentlyBoughtTogether) 
        ? productData.frequentlyBoughtTogether 
        : [],
    };

    console.log("✅ Data prepared, creating product in database...");
    
    // Create product
    const product = await prisma.onlineProduct.create({
      data: preparedData,
    });

    console.log("✅ Product created successfully with ID:", product.id);

    // Format response with proxy image URLs
    const productResponse = {
      ...product,
      variants: convertVariantImagesToUrls(product.variants),
    };

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: productResponse,
    });
  } catch (error) {
    console.error("❌ Error creating online product:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    res.status(500).json({
      success: false,
      message: "Failed to create online product",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

/**
 * Update online product
 * PUT /api/online/online-products/:id
 */
const updateOnlineProduct = async (req, res) => {
  try {
    console.log("📝 Updating online product...");
    console.log("Product ID:", req.params.id);
    console.log("Files received:", req.files ? req.files.length : 0);
    
    const { id } = req.params;
    
    // Parse product data from FormData
    let updateData;
    if (req.body.productData) {
      updateData = typeof req.body.productData === 'string' 
        ? JSON.parse(req.body.productData) 
        : req.body.productData;
    } else {
      updateData = req.body;
    }

    // 🔒 CRITICAL: Check for duplicate SKUs within variants
    if (updateData.variants && Array.isArray(updateData.variants)) {
      const skuSet = new Set();
      const duplicateSKUs = [];
      
      updateData.variants.forEach((variant, index) => {
        const sku = variant.variantSKU;
        if (sku && sku.trim() !== "") {
          if (skuSet.has(sku)) {
            duplicateSKUs.push({ sku, variantIndex: index + 1 });
          } else {
            skuSet.add(sku);
          }
        }
      });

      if (duplicateSKUs.length > 0) {
        console.log("❌ Validation failed: Duplicate SKUs detected:", duplicateSKUs);
        return res.status(400).json({
          success: false,
          message: "Duplicate SKUs detected in variants",
          details: `The following SKUs are used multiple times: ${duplicateSKUs.map(d => `${d.sku} (Variant ${d.variantIndex})`).join(", ")}. Each variant must have a unique SKU.`,
          duplicates: duplicateSKUs,
        });
      }

      // 🔒 SECURITY: Verify stock quantities don't exceed inventory limits
      for (const variant of updateData.variants) {
        if (variant.variantStockQuantity && variant.variantStockQuantity > 1000000) {
          console.log("❌ Validation failed: Unrealistic stock quantity");
          return res.status(400).json({
            success: false,
            message: "Stock quantity exceeds maximum allowed limit (1,000,000 units)",
          });
        }
      }
    }

    console.log("✅ Validation passed, uploading new images to S3...");

    // Upload new images to S3 if any
    if (req.files && req.files.length > 0) {
      console.log(`📸 Uploading ${req.files.length} new images to S3...`);
      const uploadedImageKeys = await Promise.all(
        req.files.map((file) => uploadToS3(file.buffer, file.originalname, file.mimetype))
      );
      console.log("✅ New images uploaded to S3:", uploadedImageKeys);
      
      // Map uploaded images back to variants based on fieldname
      req.files.forEach((file, index) => {
        const key = uploadedImageKeys[index];
        if (file.fieldname && file.fieldname.startsWith('variant_')) {
          const parts = file.fieldname.split('_');
          const variantIndex = parseInt(parts[1]);
          const imageIndex = parseInt(parts[3]);
          
          if (updateData.variants[variantIndex]) {
            if (!updateData.variants[variantIndex].variantImages) {
              updateData.variants[variantIndex].variantImages = [];
            }
            updateData.variants[variantIndex].variantImages[imageIndex] = key;
          }
        }
      });
    }

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    // Remove non-existent schema fields
    delete updateData.totalStockQuantity;
    delete updateData.lowStockAlertLevel;
    delete updateData.stockStatus;

    // Process variants: clean images and calculate stock status
    if (updateData.variants && Array.isArray(updateData.variants)) {
      updateData.variants = processVariantImagesForStorage(updateData.variants).map((variant) => {
        const variantLowStockAlert = variant.variantLowStockAlert || 10;
        const variantStockQuantity = variant.variantStockQuantity || 0;
        
        // Calculate variant-level stock status
        let variantStockStatus;
        if (variantStockQuantity === 0) {
          variantStockStatus = "out-of-stock";
        } else if (variantStockQuantity <= variantLowStockAlert) {
          variantStockStatus = "low-stock";
        } else {
          variantStockStatus = "in-stock";
        }
        
        return {
          ...variant,
          variantLowStockAlert,
          variantStockStatus
        };
      });
    }

    // Handle arrays - ensure they're arrays
    if (updateData.cuttingStyles !== undefined) {
      updateData.cuttingStyles = Array.isArray(updateData.cuttingStyles) ? updateData.cuttingStyles : [];
    }

    if (updateData.frequentlyBoughtTogether !== undefined) {
      updateData.frequentlyBoughtTogether = Array.isArray(updateData.frequentlyBoughtTogether) 
        ? updateData.frequentlyBoughtTogether 
        : [];
    }
    
    // Ensure countryOfOrigin has a default value if empty
    if (updateData.countryOfOrigin === "") {
      updateData.countryOfOrigin = "India";
    }

    if (updateData.gstPercentage !== undefined) {
      updateData.gstPercentage = updateData.gstPercentage === "" ? 0 : (parseFloat(updateData.gstPercentage) || 0);
    }

    console.log("✅ Updating product in database...");

    const product = await prisma.onlineProduct.update({
      where: { id },
      data: updateData,
    });

    console.log("✅ Product updated successfully");

    // Format response with proxy image URLs
    const productResponse = {
      ...product,
      variants: convertVariantImagesToUrls(product.variants),
    };

    res.json({
      success: true,
      message: "Product updated successfully",
      data: productResponse,
    });
  } catch (error) {
    console.error("❌ Error updating online product:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update online product",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

/**
 * Delete online product
 * DELETE /api/online/online-products/:id
 */
const deleteOnlineProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // First, delete all cart items that reference this product
    const deletedCartItems = await prisma.cart.deleteMany({
      where: { productId: id },
    });

    if (deletedCartItems.count > 0) {
      console.log(`🛒 Removed ${deletedCartItems.count} cart items for deleted product ${id}`);
    }

    // Then delete the product
    await prisma.onlineProduct.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Product deleted successfully",
      cartItemsRemoved: deletedCartItems.count,
    });
  } catch (error) {
    console.error("Error deleting online product:", error);
    
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete online product",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

/**
 * Get frequently bought together products for a specific product
 * GET /api/online/online-products/:id/frequently-bought-together
 */
const getFrequentlyBoughtTogether = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the main product
    const product = await prisma.onlineProduct.findUnique({
      where: { id },
      select: {
        id: true,
        frequentlyBoughtTogether: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!product.frequentlyBoughtTogether || product.frequentlyBoughtTogether.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Extract product IDs from frequently bought together
    const addonProductIds = product.frequentlyBoughtTogether.map(item => item.productId);

    // Fetch all add-on products
    const addonProducts = await prisma.onlineProduct.findMany({
      where: {
        id: { in: addonProductIds },
        productStatus: "active", // Only show active products
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

        // Convert variant images to proxy URLs
        const variantWithUrls = convertVariantImagesToUrls([variant]);

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
          },
          variant: variantWithUrls[0],
        };
      })
    );

    // Filter out null values (products that don't exist or are inactive)
    const validAddons = addonsWithDetails.filter(Boolean);

    res.json({
      success: true,
      data: validAddons,
    });
  } catch (error) {
    console.error("Error fetching frequently bought together:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch frequently bought together products",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

module.exports = {
  getAllOnlineProducts,
  getOnlineProductById,
  createOnlineProduct,
  updateOnlineProduct,
  deleteOnlineProduct,
  getFrequentlyBoughtTogether,
};
