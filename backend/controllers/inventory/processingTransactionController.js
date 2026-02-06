const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Generate transaction number
const generateTransactionNumber = async () => {
  const year = new Date().getFullYear();
  const lastTransaction = await prisma.processingTransaction.findFirst({
    where: {
      transactionNumber: {
        startsWith: `PT-${year}-`,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let sequenceNumber = 1;
  if (lastTransaction) {
    const lastNumber = parseInt(lastTransaction.transactionNumber.split("-")[2]);
    sequenceNumber = lastNumber + 1;
  }

  return `PT-${year}-${sequenceNumber.toString().padStart(3, "0")}`;
};
 
// Create processing transaction
const createProcessingTransaction = async (req, res) => {
  try {
    const {
      poolId,
      inputItemId,
      inputQuantity,
      warehouseId,
      outputs,
      wastagePercent,
      processingCost,
      notes,
    } = req.body;

    // Validate required fields
    if (!poolId || !inputItemId || !inputQuantity || !warehouseId || !outputs || outputs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Get pool item
    const poolItem = await prisma.processingPool.findUnique({
      where: { id: poolId },
    });

    if (!poolItem) {
      return res.status(404).json({
        success: false,
        message: "Processing pool item not found",
      });
    }

    // Check if sufficient stock
    if (poolItem.currentStock < inputQuantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock in processing pool. Available: ${poolItem.currentStock} ${poolItem.uom}`,
      });
    }

    // Get input item details
    const inputItem = await prisma.item.findUnique({
      where: { id: inputItemId },
    });

    if (!inputItem) {
      return res.status(404).json({
        success: false,
        message: "Input item not found",
      });
    }

    // Calculate costs
    const inputUnitCost = poolItem.avgPurchasePrice;
    const inputTotalCost = inputQuantity * inputUnitCost;
    const wastageQuantity = (inputQuantity * (wastagePercent || 0)) / 100;
    const totalCost = inputTotalCost + (processingCost || 0);

    // Generate transaction number
    const transactionNumber = await generateTransactionNumber();

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create processing transaction
      const transaction = await tx.processingTransaction.create({
        data: {
          transactionNumber,
          poolId,
          inputItemId,
          inputItemName: inputItem.itemName,
          inputQuantity,
          inputUom: inputItem.uom,
          inputUnitCost,
          inputTotalCost,
          warehouseId,
          warehouseName: poolItem.warehouseName,
          outputs,
          wastagePercent: wastagePercent || 0,
          wastageQuantity,
          processingCost: processingCost || 0,
          totalCost,
          notes: notes || null,
          status: "completed",
          processedAt: new Date(),
        },
      });

      // 2. Update processing pool stock
      const newPoolStock = poolItem.currentStock - inputQuantity;
      const newTotalValue = newPoolStock * poolItem.avgPurchasePrice;

      await tx.processingPool.update({
        where: { id: poolId },
        data: {
          currentStock: newPoolStock,
          totalValue: newTotalValue,
          totalProcessed: poolItem.totalProcessed + inputQuantity,
          totalWastage: poolItem.totalWastage + wastageQuantity,
        },
      });

      // 3. Update inventory for each output item
      for (const output of outputs) {
        const outputItem = await tx.item.findUnique({
          where: { id: output.itemId },
        });

        if (outputItem) {
          // Increase inventory stock
          await tx.item.update({
            where: { id: output.itemId },
            data: {
              quantity: outputItem.quantity + output.quantity,
            },
          });

          // Create stock adjustment record
          await tx.stockAdjustment.create({
            data: {
              itemId: output.itemId,
              itemName: output.itemName,
              category: outputItem.category,
              warehouseId,
              warehouseName: poolItem.warehouseName,
              adjustmentMethod: "processing",
              adjustmentType: "increase",
              quantity: output.quantity,
              previousQuantity: outputItem.quantity,
              newQuantity: outputItem.quantity + output.quantity,
              reason: "processing",
              reasonDetails: `Processed from ${inputItem.itemName} (${transactionNumber})`,
              adjustedBy: "system",
              notes: `Processing transaction: ${transactionNumber}`,
            },
          });

          // 4. Update or create recipe
          const existingRecipe = await tx.processingRecipe.findUnique({
            where: {
              poolId_outputItemId: {
                poolId,
                outputItemId: output.itemId,
              },
            },
          });

          if (existingRecipe) {
            await tx.processingRecipe.update({
              where: { id: existingRecipe.id },
              data: {
                timesCreated: existingRecipe.timesCreated + 1,
                totalQuantity: existingRecipe.totalQuantity + output.quantity,
                lastCreatedAt: new Date(),
              },
            });
          } else {
            await tx.processingRecipe.create({
              data: {
                poolId,
                inputItemId,
                inputItemName: inputItem.itemName,
                outputItemId: output.itemId,
                outputItemName: output.itemName,
                outputUom: output.uom,
                timesCreated: 1,
                totalQuantity: output.quantity,
                firstCreatedAt: new Date(),
                lastCreatedAt: new Date(),
              },
            });
          }
        }
      }

      return transaction;
    });

    res.status(201).json({
      success: true,
      message: "Processing completed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error creating processing transaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create processing transaction",
      error: error.message,
    });
  }
};

// Get all processing transactions
const getProcessingTransactions = async (req, res) => {
  try {
    const { poolId, warehouseId, startDate, endDate } = req.query;

    const where = {};
    if (poolId) where.poolId = poolId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (startDate || endDate) {
      where.processedAt = {};
      if (startDate) where.processedAt.gte = new Date(startDate);
      if (endDate) where.processedAt.lte = new Date(endDate);
    }

    const transactions = await prisma.processingTransaction.findMany({
      where,
      orderBy: { processedAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching processing transactions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch processing transactions",
      error: error.message,
    });
  }
};

// Get single processing transaction
const getProcessingTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.processingTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Processing transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Error fetching processing transaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch processing transaction",
      error: error.message,
    });
  }
};

module.exports = {
  createProcessingTransaction,
  getProcessingTransactions,
  getProcessingTransaction,
};
