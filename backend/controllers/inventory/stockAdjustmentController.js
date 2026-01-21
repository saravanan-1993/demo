const { prisma } = require("../../config/database");
const { sendLowStockAlert } = require("../../utils/notification/sendNotification");
const { syncOnlineProductStock } = require("../../utils/inventory/stockUpdateService");

// Get all stock adjustments with filters
const getAllStockAdjustments = async (req, res) => {
  try {
    const { itemId, warehouse, adjustmentType, reason, startDate, endDate } = req.query;

    const filter = {};
    if (itemId) filter.itemId = itemId;
    if (warehouse) filter.warehouseId = warehouse; // Use warehouseId field
    if (adjustmentType) filter.adjustmentType = adjustmentType;
    if (reason) filter.reason = reason;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.gte = new Date(startDate);
      if (endDate) filter.createdAt.lte = new Date(endDate);
    }

    const adjustments = await prisma.stockAdjustment.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: adjustments,
      count: adjustments.length,
    });
  } catch (error) {
    console.error("Error fetching stock adjustments:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch stock adjustments",
      message: error.message,
    });
  }
};

// Get stock adjustment by ID
const getStockAdjustmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id },
    });

    if (!adjustment) {
      return res.status(404).json({
        success: false,
        error: "Stock adjustment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: adjustment,
    });
  } catch (error) {
    console.error("Error fetching stock adjustment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch stock adjustment",
      message: error.message,
    });
  }
};

// Create stock adjustment (manual adjustment method)
const createStockAdjustment = async (req, res) => {
  try {
    const {
      itemId,
      adjustmentType,
      quantity,
      reason,
      reasonDetails,
      adjustedBy,
      notes,
    } = req.body;

    // Validation
    if (!itemId || !adjustmentType || !quantity || !reason || !adjustedBy) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        required: ["itemId", "adjustmentType", "quantity", "reason", "adjustedBy"],
      });
    }

    // Validate adjustment type
    if (!["increase", "decrease"].includes(adjustmentType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid adjustment type. Must be 'increase' or 'decrease'",
      });
    }

    // Validate reason for manual adjustments
    const validReasons = ["damage", "loss", "return", "found", "correction", "expired", "other"];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: "Invalid reason",
        validReasons,
      });
    }

    // Get current item details with warehouse
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        warehouse: true,
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item not found",
      });
    }

    const previousQuantity = item.quantity;
    const adjustmentQuantity = parseInt(quantity);
    
    // Calculate new quantity
    let newQuantity;
    if (adjustmentType === "increase") {
      newQuantity = previousQuantity + adjustmentQuantity;
    } else {
      newQuantity = previousQuantity - adjustmentQuantity;
      
      // Prevent negative stock
      if (newQuantity < 0) {
        return res.status(400).json({
          success: false,
          error: "Adjustment would result in negative stock",
          currentQuantity: previousQuantity,
          requestedDecrease: adjustmentQuantity,
        });
      }
    }

    // Auto-calculate status based on new quantity
    let autoStatus;
    if (newQuantity === 0) {
      autoStatus = "out_of_stock";
    } else if (newQuantity <= item.lowStockAlertLevel) {
      autoStatus = "low_stock";
    } else {
      autoStatus = "in_stock";
    }

    // Update item first
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        quantity: newQuantity,
        status: autoStatus,
      },
      include: {
        warehouse: true,
      },
    });

    // Create adjustment record (manual adjustment method)
    const adjustment = await prisma.stockAdjustment.create({
      data: {
        itemId,
        itemName: item.itemName,
        category: item.category,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse.name,
        adjustmentMethod: "adjustment", // Manual adjustment
        adjustmentType,
        quantity: adjustmentQuantity,
        previousQuantity,
        newQuantity,
        reason,
        reasonDetails: reasonDetails || null,
        adjustedBy,
        notes: notes || null,
      },
    });

    // Send low stock alert if status changed to low_stock or out_of_stock
    // OR if quantity is at or below alert level (even if status didn't change)
    if (autoStatus === "low_stock" || autoStatus === "out_of_stock") {
      // Send alert if status changed OR if we're at/below alert level
      if (item.status !== autoStatus || newQuantity <= updatedItem.lowStockAlertLevel) {
        try {
          await sendLowStockAlert(updatedItem.itemName, newQuantity, updatedItem.lowStockAlertLevel, updatedItem.warehouse.name);
          console.log(`📱 Low stock alert sent for: ${updatedItem.itemName} (Qty: ${newQuantity}, Alert: ${updatedItem.lowStockAlertLevel})`);
        } catch (notifError) {
          console.error('⚠️ Failed to send low stock alert:', notifError.message);
        }
      }
    }

    // Auto-sync POS product if exists
    try {
      const posProduct = await prisma.pOSProduct.findFirst({
        where: { itemId: updatedItem.id },
      });

      if (posProduct) {
        await prisma.pOSProduct.update({
          where: { id: posProduct.id },
          data: {
            quantity: updatedItem.quantity,
            status: updatedItem.status,
            lastSyncedFromItem: new Date(),
          },
        });
        console.log(`✅ Auto-synced POS product for item: ${updatedItem.itemName}`);
      }
    } catch (posError) {
      console.error('⚠️ Failed to auto-sync POS product:', posError);
    }

    // Auto-sync OnlineProduct totalStockQuantity
    try {
      await syncOnlineProductStock(updatedItem.id);
    } catch (onlineError) {
      console.error('⚠️ Failed to auto-sync OnlineProduct:', onlineError);
    }

    res.status(201).json({
      success: true,
      message: "Stock adjustment created successfully",
      data: {
        adjustment,
        updatedItem,
      },
    });
  } catch (error) {
    console.error("Error creating stock adjustment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create stock adjustment",
      message: error.message,
    });
  }
};

// Get adjustment history for a specific item
const getItemAdjustmentHistory = async (req, res) => {
  try {
    const { itemId } = req.params;

    const adjustments = await prisma.stockAdjustment.findMany({
      where: { itemId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: adjustments,
      count: adjustments.length,
    });
  } catch (error) {
    console.error("Error fetching item adjustment history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch adjustment history",
      message: error.message,
    });
  }
};

// Get adjustment summary/statistics
const getAdjustmentSummary = async (req, res) => {
  try {
    const { startDate, endDate, warehouse } = req.query;

    const filter = {};
    if (warehouse) filter.warehouseId = warehouse; // Use warehouseId field
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.gte = new Date(startDate);
      if (endDate) filter.createdAt.lte = new Date(endDate);
    }

    const adjustments = await prisma.stockAdjustment.findMany({
      where: filter,
    });

    // Calculate statistics
    const summary = {
      totalAdjustments: adjustments.length,
      totalIncrease: 0,
      totalDecrease: 0,
      byReason: {},
      byWarehouse: {},
    };

    adjustments.forEach((adj) => {
      if (adj.adjustmentType === "increase") {
        summary.totalIncrease += adj.quantity;
      } else {
        summary.totalDecrease += adj.quantity;
      }

      // Count by reason
      summary.byReason[adj.reason] = (summary.byReason[adj.reason] || 0) + 1;

      // Count by warehouse name
      summary.byWarehouse[adj.warehouseName] = (summary.byWarehouse[adj.warehouseName] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching adjustment summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch adjustment summary",
      message: error.message,
    });
  }
};

module.exports = {
  getAllStockAdjustments,
  getStockAdjustmentById,
  createStockAdjustment,
  getItemAdjustmentHistory,
  getAdjustmentSummary,
};
