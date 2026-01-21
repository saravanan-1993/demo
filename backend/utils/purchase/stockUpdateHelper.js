const { prisma } = require("../../config/database");
const { syncOnlineProductStock } = require("../inventory/stockUpdateService");

/**
 * Update stock after bill/GRN creation (Purchase Order received)
 * Replaces Kafka-based stock update from purchase-service
 * 
 * @param {Object} bill - Bill object with items
 * @param {Array} items - Array of bill items with received quantities
 * @returns {Promise<Array>} - Array of stock update results
 */
const updateStockAfterPurchase = async (bill, items) => {
  const results = [];

  try {
    console.log(`📦 [Purchase Stock Update] Processing GRN: ${bill.grnNumber}`);

    for (const item of items) {
      try {
        // Only update stock if item has an itemId (linked to inventory)
        if (!item.itemId) {
          console.warn(`⚠️ Item ${item.productName} has no itemId, skipping stock update`);
          results.push({
            itemId: null,
            itemName: item.productName,
            success: false,
            error: "No itemId linked to inventory",
          });
          continue;
        }

        // Find the inventory item
        const product = await prisma.item.findUnique({
          where: { id: item.itemId },
          include: { warehouse: true },
        });

        if (!product) {
          console.warn(`⚠️ Inventory item not found: ${item.itemId}`);
          results.push({
            itemId: item.itemId,
            itemName: item.productName,
            success: false,
            error: "Inventory item not found",
          });
          continue;
        }

        const previousQuantity = product.quantity;
        const quantityReceived = parseInt(item.receivedQuantity || item.quantityReceived);
        const newQuantity = previousQuantity + quantityReceived;

        // Determine new status
        let status = "in_stock";
        if (newQuantity === 0) {
          status = "out_of_stock";
        } else if (newQuantity <= product.lowStockAlertLevel) {
          status = "low_stock";
        }

        // Update product quantity and status
        const updatedProduct = await prisma.item.update({
          where: { id: product.id },
          data: {
            quantity: newQuantity,
            status,
          },
        });

        console.log(
          `✅ Stock updated: ${product.itemName} (${previousQuantity} → ${newQuantity}) - Status: ${status}`
        );

        // Create stock adjustment record for audit trail
        await prisma.stockAdjustment.create({
          data: {
            itemId: product.id,
            itemName: product.itemName,
            category: product.category,
            warehouseId: product.warehouseId,
            warehouseName: product.warehouse?.name || "Unknown",
            adjustmentMethod: "purchase_order",
            adjustmentType: "increase",
            quantity: quantityReceived,
            previousQuantity,
            newQuantity,
            adjustedBy: "system",
            // Purchase order specific fields
            purchaseOrderId: bill.purchaseOrderId || null,
            poNumber: bill.poNumber || null,
            billId: bill.id,
            grnNumber: bill.grnNumber,
            supplierId: bill.supplierId,
            supplierName: bill.supplierName,
            batchNumber: item.batchNumber || null,
            expiryDate: item.expiryDate || null,
            manufacturingDate: item.manufacturingDate || null,
            notes: `Purchase received - GRN: ${bill.grnNumber}, Supplier: ${bill.supplierName}`,
          },
        });

        console.log(
          `📝 Stock adjustment created - GRN: ${bill.grnNumber}, Method: purchase_order, Type: increase`
        );

        // Sync POS Product if exists
        try {
          const posProduct = await prisma.pOSProduct.findFirst({
            where: { itemId: product.id },
          });

          if (posProduct) {
            await prisma.pOSProduct.update({
              where: { id: posProduct.id },
              data: {
                quantity: newQuantity,
                status,
                lastSyncedFromItem: new Date(),
              },
            });
            console.log(`🔄 POS Product synced: ${product.itemName} → ${newQuantity}`);
          }
        } catch (syncError) {
          console.error(`⚠️ Failed to sync POS Product:`, syncError.message);
        }

        // Sync OnlineProduct totalStockQuantity
        try {
          await syncOnlineProductStock(product.id);
        } catch (syncError) {
          console.error(`⚠️ Failed to sync OnlineProduct:`, syncError.message);
        }

        results.push({
          itemId: product.id,
          itemName: product.itemName,
          previousQuantity,
          newQuantity,
          quantityReceived,
          status,
          success: true,
        });
      } catch (itemError) {
        console.error(`❌ Error updating stock for ${item.productName}:`, itemError.message);
        results.push({
          itemId: item.itemId,
          itemName: item.productName,
          success: false,
          error: itemError.message,
        });
      }
    }

    console.log(
      `✅ Purchase stock update completed for GRN ${bill.grnNumber}: ${
        results.filter((r) => r.success).length
      }/${results.length} items updated`
    );

    return results;
  } catch (error) {
    console.error(`❌ Error in updateStockAfterPurchase:`, error);
    throw error;
  }
};

/**
 * Reverse stock update (for bill/GRN cancellation or correction)
 * 
 * @param {Object} bill - Bill object
 * @param {Array} items - Array of bill items
 * @returns {Promise<Array>} - Array of stock update results
 */
const reverseStockAfterPurchase = async (bill, items) => {
  const results = [];

  try {
    console.log(`🔄 [Purchase Stock Reversal] Processing GRN: ${bill.grnNumber}`);

    for (const item of items) {
      try {
        if (!item.itemId) {
          console.warn(`⚠️ Item ${item.productName} has no itemId, skipping reversal`);
          continue;
        }

        const product = await prisma.item.findUnique({
          where: { id: item.itemId },
          include: { warehouse: true },
        });

        if (!product) {
          console.warn(`⚠️ Inventory item not found: ${item.itemId}`);
          continue;
        }

        const previousQuantity = product.quantity;
        const quantityToReverse = parseInt(item.receivedQuantity || item.quantityReceived);
        const newQuantity = Math.max(0, previousQuantity - quantityToReverse);

        // Determine new status
        let status = "in_stock";
        if (newQuantity === 0) {
          status = "out_of_stock";
        } else if (newQuantity <= product.lowStockAlertLevel) {
          status = "low_stock";
        }

        // Update product
        await prisma.item.update({
          where: { id: product.id },
          data: {
            quantity: newQuantity,
            status,
          },
        });

        // Create stock adjustment record
        await prisma.stockAdjustment.create({
          data: {
            itemId: product.id,
            itemName: product.itemName,
            category: product.category,
            warehouseId: product.warehouseId,
            warehouseName: product.warehouse?.name || "Unknown",
            adjustmentMethod: "adjustment",
            adjustmentType: "decrease",
            quantity: quantityToReverse,
            previousQuantity,
            newQuantity,
            adjustedBy: "system",
            billId: bill.id,
            grnNumber: bill.grnNumber,
            supplierId: bill.supplierId,
            supplierName: bill.supplierName,
            notes: `Purchase reversal - GRN: ${bill.grnNumber} cancelled/corrected`,
          },
        });

        console.log(`✅ Stock reversed: ${product.itemName} (${previousQuantity} → ${newQuantity})`);

        // Sync POS Product if exists
        try {
          const posProduct = await prisma.pOSProduct.findFirst({
            where: { itemId: product.id },
          });

          if (posProduct) {
            await prisma.pOSProduct.update({
              where: { id: posProduct.id },
              data: {
                quantity: newQuantity,
                status,
                lastSyncedFromItem: new Date(),
              },
            });
            console.log(`🔄 POS Product synced: ${product.itemName} → ${newQuantity}`);
          }
        } catch (syncError) {
          console.error(`⚠️ Failed to sync POS Product:`, syncError.message);
        }

        // Sync OnlineProduct totalStockQuantity
        try {
          await syncOnlineProductStock(product.id);
        } catch (syncError) {
          console.error(`⚠️ Failed to sync OnlineProduct:`, syncError.message);
        }

        results.push({
          itemId: product.id,
          itemName: product.itemName,
          previousQuantity,
          newQuantity,
          quantityReversed: quantityToReverse,
          status,
          success: true,
        });
      } catch (itemError) {
        console.error(`❌ Error reversing stock for ${item.productName}:`, itemError.message);
        results.push({
          itemId: item.itemId,
          itemName: item.productName,
          success: false,
          error: itemError.message,
        });
      }
    }

    console.log(`✅ Purchase stock reversal completed for GRN ${bill.grnNumber}`);
    return results;
  } catch (error) {
    console.error(`❌ Error in reverseStockAfterPurchase:`, error);
    throw error;
  }
};

module.exports = {
  updateStockAfterPurchase,
  reverseStockAfterPurchase,
};
