const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all processing pool items
const getProcessingPool = async (req, res) => {
  try {
    const { warehouseId, status, category } = req.query;

    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;
    if (category) where.category = category;

    const poolItems = await prisma.processingPool.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: poolItems,
    });
  } catch (error) {
    console.error("Error fetching processing pool:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch processing pool",
      error: error.message,
    });
  }
};

// Get single processing pool item
const getProcessingPoolItem = async (req, res) => {
  try {
    const { id } = req.params;

    const poolItem = await prisma.processingPool.findUnique({
      where: { id },
    });

    if (!poolItem) {
      return res.status(404).json({
        success: false,
        message: "Processing pool item not found",
      });
    }

    res.status(200).json({
      success: true,
      data: poolItem,
    });
  } catch (error) {
    console.error("Error fetching processing pool item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch processing pool item",
      error: error.message,
    });
  }
};

// Get recipe for a processing pool item (previously created items)
const getProcessingRecipe = async (req, res) => {
  try {
    const { poolId } = req.params;

    const recipes = await prisma.processingRecipe.findMany({
      where: { poolId },
      orderBy: { lastCreatedAt: "desc" },
    });

    // Get current stock for each output item
    const recipesWithStock = await Promise.all(
      recipes.map(async (recipe) => {
        const item = await prisma.item.findUnique({
          where: { id: recipe.outputItemId },
          select: { quantity: true },
        });

        return {
          itemId: recipe.outputItemId,
          itemName: recipe.outputItemName,
          uom: recipe.outputUom,
          currentStock: item?.quantity || 0,
          timesCreated: recipe.timesCreated,
          totalQuantity: recipe.totalQuantity,
          lastCreatedAt: recipe.lastCreatedAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: recipesWithStock,
    });
  } catch (error) {
    console.error("Error fetching processing recipe:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch processing recipe",
      error: error.message,
    });
  }
};

// Add stock to processing pool (called when purchasing/creating processing items)
const addToProcessingPool = async (itemId, quantity, purchasePrice, warehouseId, warehouseName) => {
  try {
    // Get item details
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error("Item not found");
    }

    if (item.itemType !== "processing") {
      throw new Error("Item is not a processing type");
    }

    // Find or create processing pool entry
    let poolItem = await prisma.processingPool.findFirst({
      where: {
        itemId,
        warehouseId,
      },
    });

    if (poolItem) {
      // Update existing pool item with weighted average price
      const newTotalValue = poolItem.totalValue + quantity * purchasePrice;
      const newCurrentStock = poolItem.currentStock + quantity;
      const newAvgPrice = newTotalValue / newCurrentStock;

      poolItem = await prisma.processingPool.update({
        where: { id: poolItem.id },
        data: {
          currentStock: newCurrentStock,
          avgPurchasePrice: newAvgPrice,
          totalValue: newTotalValue,
          totalPurchased: poolItem.totalPurchased + quantity,
        },
      });
    } else {
      // Create new pool item
      poolItem = await prisma.processingPool.create({
        data: {
          itemId,
          itemName: item.itemName,
          category: item.category,
          itemCode: item.itemCode,
          warehouseId,
          warehouseName,
          currentStock: quantity,
          uom: item.uom,
          avgPurchasePrice: purchasePrice,
          totalValue: quantity * purchasePrice,
          totalPurchased: quantity,
          status: "active",
        },
      });
    }

    return poolItem;
  } catch (error) {
    console.error("Error adding to processing pool:", error);
    throw error;
  }
};

module.exports = {
  getProcessingPool,
  getProcessingPoolItem,
  getProcessingRecipe,
  addToProcessingPool,
};
