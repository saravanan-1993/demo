const { prisma } = require("../../config/database");

// Static badges (always available)
// For Homepage: "Bestseller", "Trending", "New Arrival", and "Hot Deal" are used
// For Products Page: All badges are available
const STATIC_BADGES = [
  { id: "static-new-arrival", name: "New Arrival", isStatic: true },
  { id: "static-bestseller", name: "Bestseller", isStatic: true },
  { id: "static-trending", name: "Trending", isStatic: true },
  { id: "static-hot-deal", name: "Hot Deal", isStatic: true },
  { id: "static-limited-stock", name: "Limited Stock", isStatic: true },
  { id: "static-sale", name: "Sale", isStatic: true },
];

/**
 * Get all badges (static + custom)
 * GET /api/online/badges
 */
const getAllBadges = async (req, res) => {
  try {
    // Get custom badges from database
    const customBadges = await prisma.badge.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    // Add isStatic flag to custom badges
    const customBadgesWithFlag = customBadges.map(badge => ({
      ...badge,
      isStatic: false,
    }));

    // Combine static and custom badges
    const allBadges = [...STATIC_BADGES, ...customBadgesWithFlag];

    res.json({
      success: true,
      data: {
        static: STATIC_BADGES,
        custom: customBadgesWithFlag,
        all: allBadges,
      },
    });
  } catch (error) {
    console.error("Error fetching badges:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch badges",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

/**
 * Create custom badge
 * POST /api/online/badges
 */
const createBadge = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Badge name is required",
      });
    }

    // Check if badge name conflicts with static badges
    const isStaticBadge = STATIC_BADGES.some(
      badge => badge.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (isStaticBadge) {
      return res.status(400).json({
        success: false,
        message: "This badge name is reserved. Please use a different name.",
      });
    }

    // Check if custom badge already exists
    const existingBadge = await prisma.badge.findUnique({
      where: { name: name.trim() },
    });

    if (existingBadge) {
      return res.status(400).json({
        success: false,
        message: "Badge already exists",
      });
    }

    const badge = await prisma.badge.create({
      data: {
        name: name.trim(),
      },
    });

    res.status(201).json({
      success: true,
      message: "Badge created successfully",
      data: { ...badge, isStatic: false },
    });
  } catch (error) {
    console.error("Error creating badge:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create badge",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

/**
 * Update custom badge
 * PUT /api/online/badges/:id
 */
const updateBadge = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Prevent updating static badges
    if (id.startsWith("static-")) {
      return res.status(400).json({
        success: false,
        message: "Cannot update static badges",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Badge name is required",
      });
    }

    // Check if name conflicts with static badges
    const isStaticBadge = STATIC_BADGES.some(
      badge => badge.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (isStaticBadge) {
      return res.status(400).json({
        success: false,
        message: "This badge name is reserved. Please use a different name.",
      });
    }

    // Check if another custom badge with same name exists
    const existingBadge = await prisma.badge.findFirst({
      where: {
        name: name.trim(),
        id: { not: id },
      },
    });

    if (existingBadge) {
      return res.status(400).json({
        success: false,
        message: "Badge name already exists",
      });
    }

    const badge = await prisma.badge.update({
      where: { id },
      data: { name: name.trim() },
    });

    res.json({
      success: true,
      message: "Badge updated successfully",
      data: { ...badge, isStatic: false },
    });
  } catch (error) {
    console.error("Error updating badge:", error);
    
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Badge not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update badge",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

/**
 * Delete custom badge
 * DELETE /api/online/badges/:id
 */
const deleteBadge = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting static badges
    if (id.startsWith("static-")) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete static badges",
      });
    }

    await prisma.badge.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Badge deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting badge:", error);
    
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Badge not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete badge",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

module.exports = {
  getAllBadges,
  createBadge,
  updateBadge,
  deleteBadge,
};
