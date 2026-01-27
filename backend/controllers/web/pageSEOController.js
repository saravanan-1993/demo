const { prisma } = require("../../config/database");
const { uploadToS3, deleteFromS3, getPresignedUrl } = require("../../utils/web/uploadsS3");

// Define all public pages
const PUBLIC_PAGES = [
  { path: "/", name: "Home", description: "Homepage of the website" },
  { path: "/about", name: "About Us", description: "About us page" },
  { path: "/products", name: "Products", description: "All products listing page" },
  { path: "/category", name: "Categories", description: "All categories listing page" },
  { path: "/cart", name: "Cart", description: "Shopping cart page" },
  { path: "/checkout", name: "Checkout", description: "Checkout page" },
  { path: "/wishlist", name: "Wishlist", description: "Wishlist page" },
  { path: "/compare", name: "Compare Products", description: "Product comparison page" },
  { path: "/contact", name: "Contact Us", description: "Contact us page" },
  { path: "/faq", name: "FAQ", description: "Frequently asked questions page" },
  { path: "/privacy", name: "Privacy Policy", description: "Privacy policy page" },
  { path: "/terms", name: "Terms & Conditions", description: "Terms and conditions page" },
  { path: "/returns", name: "Returns Policy", description: "Returns and refunds policy page" },
  { path: "/shipping", name: "Shipping Policy", description: "Shipping policy page" },
  { path: "/cookie", name: "Cookie Policy", description: "Cookie policy page" },
  { path: "/my-orders", name: "My Orders", description: "User orders history page" },
  { path: "/signin", name: "Sign In", description: "User sign in page" },
  { path: "/signup", name: "Sign Up", description: "User registration page" },
  { path: "/forgot-password", name: "Forgot Password", description: "Password recovery page" },
  { path: "/reset-password", name: "Reset Password", description: "Password reset page" },
  { path: "/verify-email", name: "Verify Email", description: "Email verification page" },
  { path: "/profile", name: "User Profile", description: "User profile and account settings page" },
];

// Get all page SEO settings
const getAllPageSEO = async (req, res) => {
  try {
    console.log("Fetching all page SEO settings...");

    const pageSEOList = await prisma.pageSEO.findMany({
      orderBy: {
        pagePath: "asc",
      },
    });

    console.log(`Found ${pageSEOList.length} page SEO records`);

    // Generate pre-signed URLs for OG images
    const pageSEOWithUrls = await Promise.all(
      pageSEOList.map((pageSEO) => {
        try {
          const ogImageUrl = pageSEO.ogImage
            ? getPresignedUrl(pageSEO.ogImage, 3600)
            : null;
          return {
            ...pageSEO,
            ogImage: ogImageUrl,
          };
        } catch (error) {
          console.error(`Error generating URL for page ${pageSEO.pagePath}:`, error);
          return {
            ...pageSEO,
            ogImage: pageSEO.ogImage, // Return original key if pre-signed URL fails
          };
        }
      })
    );

    // Merge with PUBLIC_PAGES to ensure all pages are represented
    const allPages = PUBLIC_PAGES.map((publicPage) => {
      const existingSEO = pageSEOWithUrls.find((seo) => seo.pagePath === publicPage.path);
      if (existingSEO) {
        return existingSEO;
      }
      // Return default values for pages without SEO data
      return {
        id: null,
        pagePath: publicPage.path,
        pageName: publicPage.name,
        description: publicPage.description,
        metaTitle: "",
        metaDescription: "",
        metaKeywords: "",
        ogImage: null,
        isActive: true,
        createdAt: null,
        updatedAt: null,
      };
    });

    res.status(200).json({
      success: true,
      data: allPages,
    });
  } catch (error) {
    console.error("Error fetching page SEO settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch page SEO settings",
      message: error.message,
    });
  }
};

// Get single page SEO by path
const getPageSEOByPath = async (req, res) => {
  try {
    const { path } = req.params;
    const decodedPath = decodeURIComponent(path);

    console.log(`Fetching SEO for page: ${decodedPath}`);

    const pageSEO = await prisma.pageSEO.findUnique({
      where: { pagePath: decodedPath },
    });

    if (!pageSEO) {
      // Return default values if not found
      const publicPage = PUBLIC_PAGES.find((p) => p.path === decodedPath);
      if (!publicPage) {
        return res.status(404).json({
          success: false,
          error: "Page not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          pagePath: publicPage.path,
          pageName: publicPage.name,
          description: publicPage.description,
          metaTitle: "",
          metaDescription: "",
          metaKeywords: "",
          ogImage: null,
          isActive: true,
        },
      });
    }

    // Generate proxy URL for OG image
    const ogImageUrl = pageSEO.ogImage
      ? getPresignedUrl(pageSEO.ogImage, 3600)
      : null;

    res.status(200).json({
      success: true,
      data: {
        ...pageSEO,
        ogImage: ogImageUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching page SEO:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch page SEO",
      message: error.message,
    });
  }
};

// Create or update page SEO
const savePageSEO = async (req, res) => {
  try {
    const {
      pagePath,
      pageName,
      description,
      metaTitle,
      metaDescription,
      metaKeywords,
      isActive,
    } = req.body;
    const ogImageFile = req.file;

    // Validation
    if (!pagePath || !pagePath.trim()) {
      return res.status(400).json({
        success: false,
        error: "Page path is required",
      });
    }

    if (!pageName || !pageName.trim()) {
      return res.status(400).json({
        success: false,
        error: "Page name is required",
      });
    }

    console.log(`Saving SEO for page: ${pagePath}`);

    // Check if SEO already exists for this page
    const existingSEO = await prisma.pageSEO.findUnique({
      where: { pagePath: pagePath.trim() },
    });

    let ogImageKey = existingSEO?.ogImage || null;

    // If new OG image is uploaded
    if (ogImageFile) {
      // Delete old image from S3 if exists
      if (existingSEO?.ogImage) {
        try {
          await deleteFromS3(existingSEO.ogImage);
        } catch (error) {
          console.error("Error deleting old OG image:", error);
          // Continue even if delete fails
        }
      }

      // Upload new image to S3
      ogImageKey = await uploadToS3(ogImageFile, "seo");
    }

    const seoData = {
      pagePath: pagePath.trim(),
      pageName: pageName.trim(),
      description: description?.trim() || null,
      metaTitle: metaTitle?.trim() || "",
      metaDescription: metaDescription?.trim() || "",
      metaKeywords: metaKeywords?.trim() || "",
      ogImage: ogImageKey,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    };

    let pageSEO;

    if (existingSEO) {
      // Update existing SEO
      pageSEO = await prisma.pageSEO.update({
        where: { id: existingSEO.id },
        data: seoData,
      });
      console.log(`Page SEO updated for: ${pagePath}`);
    } else {
      // Create new SEO
      pageSEO = await prisma.pageSEO.create({
        data: seoData,
      });
      console.log(`Page SEO created for: ${pagePath}`);
    }

    // Generate proxy URL for response
    const ogImageUrl = pageSEO.ogImage
      ? getPresignedUrl(pageSEO.ogImage, 3600)
      : null;

    res.status(200).json({
      success: true,
      message: "Page SEO saved successfully",
      data: {
        ...pageSEO,
        ogImage: ogImageUrl,
      },
    });
  } catch (error) {
    console.error("Error saving page SEO:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save page SEO",
      message: error.message,
    });
  }
};

// Delete page SEO
const deletePageSEO = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`Deleting page SEO: ${id}`);

    // Check if SEO exists
    const pageSEO = await prisma.pageSEO.findUnique({
      where: { id },
    });

    if (!pageSEO) {
      return res.status(404).json({
        success: false,
        error: "Page SEO not found",
      });
    }

    // Delete OG image from S3 if exists
    if (pageSEO.ogImage) {
      try {
        await deleteFromS3(pageSEO.ogImage);
      } catch (error) {
        console.error("Error deleting OG image from S3:", error);
        // Continue even if delete fails
      }
    }

    // Delete SEO from database
    await prisma.pageSEO.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Page SEO deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting page SEO:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete page SEO",
      message: error.message,
    });
  }
};

module.exports = {
  getAllPageSEO,
  getPageSEOByPath,
  savePageSEO,
  deletePageSEO,
};
