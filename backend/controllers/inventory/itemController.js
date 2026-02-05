const { prisma } = require("../../config/database");
const multer = require("multer");
const path = require("path");
const { uploadToS3, deleteFromS3, getPresignedUrl } = require("../../utils/inventory/s3Upload");
const { sendLowStockAlert } = require("../../utils/notification/sendNotification");
const { syncOnlineProductStock } = require("../../utils/inventory/stockUpdateService");

// Configure multer for memory storage (for S3 upload)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Get all items
const getAllItems = async (req, res) => {
  try {
    const { category, warehouse, status } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (warehouse) filter.warehouseId = warehouse;
    if (status) filter.status = status;

    const items = await prisma.item.findMany({
      where: filter,
      include: { warehouse: true },
      orderBy: { createdAt: "desc" },
    });

    const itemsWithPresignedUrls = await Promise.all(
      items.map((item) => ({
        ...item,
        itemImage: item.itemImage ? getPresignedUrl(item.itemImage, 3600) : null,
      }))
    );

    res.status(200).json({
      success: true,
      data: itemsWithPresignedUrls,
      count: itemsWithPresignedUrls.length,
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch items",
      message: error.message,
    });
  }
};

// Get item by ID
const getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await prisma.item.findUnique({
      where: { id },
      include: { warehouse: true },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item not found",
      });
    }

    const itemWithProxyUrl = {
      ...item,
      itemImage: item.itemImage ? getPresignedUrl(item.itemImage, 3600) : null,
    };

    res.status(200).json({
      success: true,
      data: itemWithPresignedUrl,
    });
  } catch (error) {
    console.error("Error fetching item:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch item",
      message: error.message,
    });
  }
};

// Create new item
const createItem = async (req, res) => {
  try {
    const {
      itemName, category, itemCode, uom, purchasePrice, gstRateId, gstPercentage,
      hsnCode, warehouse, openingStock, lowStockAlertLevel, status, expiryDate, description,
    } = req.body;

    if (!itemName || !category || !uom || !purchasePrice || !warehouse || !openingStock || !lowStockAlertLevel) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        required: ["itemName", "category", "uom", "purchasePrice", "warehouse", "openingStock", "lowStockAlertLevel"],
      });
    }

    // Check for duplicate SKU/itemCode
    if (itemCode && itemCode.trim() !== "") {
      const existingItem = await prisma.item.findFirst({
        where: { itemCode: itemCode.trim() },
      });

      if (existingItem) {
        return res.status(400).json({
          success: false,
          error: "Duplicate SKU/Item Code",
          message: `An item with SKU/Item Code "${itemCode.trim()}" already exists.`,
        });
      }
    }

    // Verify warehouse exists
    const warehouseExists = await prisma.warehouse.findUnique({
      where: { id: warehouse },
    });

    if (!warehouseExists) {
      return res.status(404).json({
        success: false,
        error: "Warehouse not found",
      });
    }

    // Handle image upload to S3
    let itemImage = null;
    if (req.file) {
      try {
        itemImage = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype);
      } catch (error) {
        console.error("Error uploading image to S3:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to upload image",
          message: error.message,
        });
      }
    }

    const quantity = parseInt(openingStock);
    const alertLevel = parseInt(lowStockAlertLevel);
    
    // Auto-calculate status based on quantity
    let autoStatus;
    if (quantity === 0) {
      autoStatus = "out_of_stock";
    } else if (quantity <= alertLevel) {
      autoStatus = "low_stock";
    } else {
      autoStatus = "in_stock";
    }

    const item = await prisma.item.create({
      data: {
        itemName,
        category,
        itemCode: itemCode || null,
        uom,
        purchasePrice: parseFloat(purchasePrice),
        gstRateId: gstRateId || null,
        gstPercentage: gstPercentage ? parseFloat(gstPercentage) : 0,
        hsnCode: hsnCode || null,
        warehouseId: warehouse,
        openingStock: quantity,
        quantity: quantity,
        lowStockAlertLevel: alertLevel,
        status: autoStatus,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        description: description || null,
        itemImage,
      },
      include: { warehouse: true },
    });

    // Send low stock alert if item is created with low stock
    if (autoStatus === "low_stock" || autoStatus === "out_of_stock") {
      try {
        await sendLowStockAlert(item.itemName, quantity, alertLevel, item.warehouse.name);
        console.log(`📱 Low stock alert sent for: ${item.itemName}`);
      } catch (notifError) {
        console.error('⚠️ Failed to send low stock alert:', notifError.message);
      }
    }

    // ❌ REMOVED: Auto-creation of POS products
    // POS products will only be created when user explicitly edits them in POS Products page

    res.status(201).json({
      success: true,
      message: "Item created successfully",
      data: item,
    });
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create item",
      message: error.message,
    });
  }
};

// Update item
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      itemName, category, itemCode, uom, purchasePrice, gstRateId, gstPercentage,
      hsnCode, warehouse, openingStock, lowStockAlertLevel, status, expiryDate, description,
    } = req.body;

    const existingItem = await prisma.item.findUnique({ where: { id } });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: "Item not found",
      });
    }

    // Check for duplicate SKU/itemCode
    if (itemCode && itemCode.trim() !== "") {
      const duplicateItem = await prisma.item.findFirst({
        where: {
          itemCode: itemCode.trim(),
          id: { not: id },
        },
      });

      if (duplicateItem) {
        return res.status(400).json({
          success: false,
          error: "Duplicate SKU/Item Code",
          message: `An item with SKU/Item Code "${itemCode.trim()}" already exists.`,
        });
      }
    }

    // Handle image upload to S3
    let itemImage = existingItem.itemImage;
    if (req.file) {
      try {
        if (existingItem.itemImage) {
          await deleteFromS3(existingItem.itemImage);
        }
        itemImage = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype);
      } catch (error) {
        console.error("Error uploading image to S3:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to upload image",
          message: error.message,
        });
      }
    }

    const quantity = existingItem.quantity;
    const alertLevel = parseInt(lowStockAlertLevel);
    
    // Auto-calculate status based on current quantity
    let autoStatus;
    if (quantity === 0) {
      autoStatus = "out_of_stock";
    } else if (quantity <= alertLevel) {
      autoStatus = "low_stock";
    } else {
      autoStatus = "in_stock";
    }

    const item = await prisma.item.update({
      where: { id },
      data: {
        itemName,
        category,
        itemCode,
        uom,
        purchasePrice: parseFloat(purchasePrice),
        gstRateId: gstRateId || null,
        gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage) : existingItem.gstPercentage,
        hsnCode,
        warehouse,
        openingStock: parseInt(openingStock),
        lowStockAlertLevel: alertLevel,
        status: autoStatus,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        description,
        itemImage,
      },
      include: { warehouse: true },
    });

    // Send low stock alert if status changed to low_stock or out_of_stock
    // OR if quantity is at or below alert level (even if status didn't change)
    if (autoStatus === "low_stock" || autoStatus === "out_of_stock") {
      // Send alert if status changed OR if we're at/below alert level
      if (existingItem.status !== autoStatus || quantity <= alertLevel) {
        try {
          await sendLowStockAlert(item.itemName, quantity, alertLevel, item.warehouse.name);
          console.log(`📱 Low stock alert sent for: ${item.itemName} (Qty: ${quantity}, Alert: ${alertLevel})`);
        } catch (notifError) {
          console.error('⚠️ Failed to send low stock alert:', notifError.message);
        }
      }
    }

    // ✅ KEEP: Auto-sync POS product if exists (update stock and status only)
    // This ensures POS products stay in sync with inventory after they're created
    try {
      const posProduct = await prisma.pOSProduct.findFirst({
        where: { itemId: item.id },
      });

      if (posProduct) {
        await prisma.pOSProduct.update({
          where: { id: posProduct.id },
          data: {
            quantity: item.quantity,
            status: item.status,
            warehouse: item.warehouse.name,
            lastSyncedFromItem: new Date(),
          },
        });
        console.log(`✅ Auto-synced POS product for item: ${item.itemName}`);
      }
    } catch (posError) {
      console.error('⚠️ Failed to auto-sync POS product:', posError);
      // Don't fail the item update if POS sync fails
    }

    // Auto-sync OnlineProduct totalStockQuantity if this item is used in variants
    try {
      await syncOnlineProductStock(item.id);
    } catch (onlineError) {
      console.error('⚠️ Failed to auto-sync OnlineProduct:', onlineError);
      // Don't fail the item update if OnlineProduct sync fails
    }

    res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: item,
    });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update item",
      message: error.message,
    });
  }
};

// Delete item
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    const existingItem = await prisma.item.findUnique({ where: { id } });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: "Item not found",
      });
    }

    if (existingItem.itemImage) {
      await deleteFromS3(existingItem.itemImage);
    }

    await prisma.item.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete item",
      message: error.message,
    });
  }
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  upload,
};
