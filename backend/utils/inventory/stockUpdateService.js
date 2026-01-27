const { prisma } = require("../../config/database");
const { sendLowStockAlert } = require("../notification/sendNotification");
const { checkWishlistBackInStock } = require("../notification/wishlistAlertScheduler");

/**
 * Update stock after order creation (POS or Online)
 * This replaces the Kafka-based stock update flow from microservices
 * 
 * @param {Object} order - Order object with items
 * @param {String} source - "POS_ORDER" or "ONLINE_ORDER"
 * @returns {Promise<Array>} - Array of stock update results
 */
const updateStockAfterOrder = async (order, source = "POS_ORDER") => {
  const results = [];

  try {
    console.log(`📦 [Stock Update] Processing ${source} for order: ${order.orderNumber}`);

    for (const item of order.items) {
      try {
        // For POS orders, we need to update both POSProduct and Item (inventory)
        // For Online orders, we need to find Item using inventoryProductId
        
        let product = null;
        let isPOSProduct = false;

        if (source === "POS_ORDER") {
          // First try to find in POSProduct collection
          const posProduct = await prisma.pOSProduct.findUnique({
            where: { id: item.productId },
          });

          if (posProduct) {
            isPOSProduct = true;
            
            // Find the corresponding inventory item using itemId from POSProduct
            if (posProduct.itemId) {
              product = await prisma.item.findUnique({
                where: { id: posProduct.itemId },
                include: { warehouse: true },
              });
              
              if (product) {
                console.log(`🔗 Found inventory item via POSProduct.itemId: ${product.itemName}`);
              }
            }
            
            // Fallback: try itemCode if itemId lookup failed
            if (!product && posProduct.itemCode) {
              product = await prisma.item.findFirst({
                where: { itemCode: posProduct.itemCode },
                include: { warehouse: true },
              });
              
              if (product) {
                console.log(`🔗 Found inventory item via itemCode: ${product.itemName}`);
              }
            }
          }
        } else if (source === "ONLINE_ORDER") {
          // For online orders, use inventoryProductId to find the Item
          if (item.inventoryProductId) {
            product = await prisma.item.findUnique({
              where: { id: item.inventoryProductId },
              include: { warehouse: true },
            });
            
            if (product) {
              console.log(`🔗 Found inventory item via inventoryProductId: ${product.itemName}`);
            }
          }
        }

        // If not found yet, try direct productId lookup
        if (!product) {
          product = await prisma.item.findUnique({
            where: { id: item.productId },
            include: {
              warehouse: true,
            },
          });
        }

        if (!product) {
          console.warn(`⚠️ Product not found in inventory: ${item.productId} (${item.productName})`);
          results.push({
            productId: item.productId,
            productName: item.productName,
            success: false,
            error: "Product not found in inventory",
          });
          continue;
        }

        const previousQuantity = product.quantity;
        const quantitySold = item.quantity;
        const newQuantity = Math.max(0, previousQuantity - quantitySold);

        // Check if sufficient stock available
        if (newQuantity < 0) {
          console.error(
            `❌ Insufficient stock for ${product.itemName}: Available: ${previousQuantity}, Requested: ${quantitySold}`
          );
        }

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

        // Sync POS Product quantity to match inventory (for ALL order types)
        try {
          // Find all POS products linked to this inventory item
          const linkedPosProducts = await prisma.pOSProduct.findMany({
            where: { itemId: product.id }
          });

          for (const linkedPosProduct of linkedPosProducts) {
            await prisma.pOSProduct.update({
              where: { id: linkedPosProduct.id },
              data: {
                quantity: newQuantity,
                status,
                lastSyncedFromItem: new Date(),
              },
            });
            console.log(`🔄 POS Product synced: ${product.itemName} (POS ID: ${linkedPosProduct.id}) → ${newQuantity}`);
          }
        } catch (syncError) {
          console.error(`⚠️ Failed to sync POS Products:`, syncError.message);
        }

        // Sync OnlineProduct totalStockQuantity (for ALL order types)
        try {
          await syncOnlineProductStock(product.id);
        } catch (syncError) {
          console.error(`⚠️ Failed to sync OnlineProduct:`, syncError.message);
        }

        // Create stock adjustment record for audit trail
        const warehouseName = product.warehouse && typeof product.warehouse === 'object' 
          ? product.warehouse.name 
          : (product.warehouse || "Unknown");
          
        await prisma.stockAdjustment.create({
          data: {
            itemId: product.id,
            itemName: product.itemName,
            category: product.category,
            warehouseId: product.warehouseId,
            warehouseName: warehouseName,
            adjustmentMethod: "sales_order",
            adjustmentType: "decrease",
            quantity: quantitySold,
            previousQuantity,
            newQuantity,
            adjustedBy: "system",
            // Sales order specific fields
            salesOrderId: order.id,
            soNumber: order.invoiceNumber || order.orderNumber,
            customerId: order.customerId || null,
            customerName: order.customerName || "Walk-in Customer",
            notes: `${source === "POS_ORDER" ? "POS" : "Online"} sale - Invoice: ${
              order.invoiceNumber || order.orderNumber
            }, Payment: ${order.paymentMethod}`,
          },
        });

        console.log(
          `📝 Stock adjustment created - Invoice: ${
            order.invoiceNumber || order.orderNumber
          }, Method: sales_order, Type: decrease`
        );

        // Log stock alerts and send notifications
        if (status === "low_stock") {
          console.warn(
            `⚠️ LOW STOCK ALERT: ${product.itemName} - Quantity: ${newQuantity} (Alert Level: ${product.lowStockAlertLevel})`
          );
          
          // Only send notification if we weren't ALREADY low stock/out of stock
          // or if this is a significant drop (optional, but for now strict state change)
          const wasLowOrOut = previousQuantity <= product.lowStockAlertLevel;
          
          if (!wasLowOrOut) {
            // Send low stock notification to admins
            try {
              const warehouseName = product.warehouse && typeof product.warehouse === 'object' 
                ? product.warehouse.name 
                : (product.warehouse || "Unknown");
                
              await sendLowStockAlert(
                product.itemName, 
                newQuantity, 
                product.lowStockAlertLevel, 
                warehouseName
              );
              console.log(`📱 Low stock notification sent for: ${product.itemName}`);
            } catch (notifError) {
              console.error('⚠️ Failed to send low stock notification:', notifError.message);
            }
          }
        } else if (status === "out_of_stock") {
          console.error(`❌ OUT OF STOCK: ${product.itemName} - Quantity: ${newQuantity}`);
          
          // Only send notification if we weren't ALREADY out of stock
          const wasOutOfStock = previousQuantity === 0;
          
          if (!wasOutOfStock) {
            // Send out of stock notification to admins
            try {
              const warehouseName = product.warehouse && typeof product.warehouse === 'object' 
                ? product.warehouse.name 
                : (product.warehouse || "Unknown");
                
              await sendLowStockAlert(
                product.itemName, 
                newQuantity, 
                product.lowStockAlertLevel, 
                warehouseName
              );
              console.log(`📱 Out of stock notification sent for: ${product.itemName}`);
            } catch (notifError) {
              console.error('⚠️ Failed to send out of stock notification:', notifError.message);
            }
          }
        }

        results.push({
          productId: product.id,
          productName: product.itemName,
          previousQuantity,
          newQuantity,
          quantitySold,
          status,
          success: true,
        });
      } catch (itemError) {
        console.error(`❌ Error updating stock for ${item.productName}:`, itemError.message);
        results.push({
          productId: item.productId,
          productName: item.productName,
          success: false,
          error: itemError.message,
        });
      }
    }

    console.log(
      `✅ Stock update completed for order ${order.orderNumber}: ${results.filter((r) => r.success).length}/${
        results.length
      } items updated`
    );

    return results;
  } catch (error) {
    console.error(`❌ Error in updateStockAfterOrder:`, error);
    throw error;
  }
};

/**
 * Update stock after manual stock adjustment
 * This replaces the stock adjustment flow from inventory-service
 * 
 * @param {Object} adjustment - Stock adjustment data
 * @returns {Promise<Object>} - Updated product
 */
const updateStockAfterAdjustment = async (adjustment) => {
  try {
    const { itemId, adjustmentType, quantity } = adjustment;

    // Find the product
    const product = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        warehouse: true,
      },
    });

    if (!product) {
      throw new Error(`Product not found: ${itemId}`);
    }

    const previousQuantity = product.quantity;
    let newQuantity;

    // Calculate new quantity based on adjustment type
    if (adjustmentType === "increase") {
      newQuantity = previousQuantity + quantity;
    } else {
      newQuantity = Math.max(0, previousQuantity - quantity);
    }

    // Determine new status
    let status = "in_stock";
    if (newQuantity === 0) {
      status = "out_of_stock";
    } else if (newQuantity <= product.lowStockAlertLevel) {
      status = "low_stock";
    }

    // Update product
    const updatedProduct = await prisma.item.update({
      where: { id: itemId },
      data: {
        quantity: newQuantity,
        status,
      },
    });

    console.log(
      `✅ Stock adjusted: ${product.itemName} (${previousQuantity} → ${newQuantity}) - ${adjustmentType} by ${quantity}`
    );

    return {
      product: updatedProduct,
      previousQuantity,
      newQuantity,
      quantityChange: adjustmentType === "increase" ? quantity : -quantity,
      status,
    };
  } catch (error) {
    console.error(`❌ Error in updateStockAfterAdjustment:`, error);
    throw error;
  }
};

/**
 * Reverse stock update (for order cancellation/refund)
 * 
 * @param {Object} order - Order object with items
 * @param {String} source - "POS_ORDER" or "ONLINE_ORDER"
 * @returns {Promise<Array>} - Array of stock update results
 */
const reverseStockUpdate = async (order, source = "POS_ORDER") => {
  const results = [];

  try {
    console.log(`🔄 [Stock Reversal] Processing ${source} reversal for order: ${order.orderNumber}`);

    for (const item of order.items) {
      try {
        const product = await prisma.item.findUnique({
          where: { id: item.productId },
          include: {
            warehouse: true,
          },
        });

        if (!product) {
          console.warn(`⚠️ Product not found: ${item.productId}`);
          continue;
        }

        const previousQuantity = product.quantity;
        const quantityReturned = item.quantity;
        const newQuantity = previousQuantity + quantityReturned;

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
            warehouseName: product.warehouse?.name || product.warehouse || "Unknown",
            adjustmentMethod: "sales_return",
            adjustmentType: "increase",
            quantity: quantityReturned,
            previousQuantity,
            newQuantity,
            adjustedBy: "system",
            salesOrderId: order.id,
            soNumber: order.invoiceNumber || order.orderNumber,
            customerId: order.customerId || null,
            customerName: order.customerName || "Walk-in Customer",
            notes: `${source === "POS_ORDER" ? "POS" : "Online"} order cancelled/refunded - Invoice: ${
              order.invoiceNumber || order.orderNumber
            }`,
          },
        });

        console.log(`✅ Stock reversed: ${product.itemName} (${previousQuantity} → ${newQuantity})`);

        results.push({
          productId: product.id,
          productName: product.itemName,
          previousQuantity,
          newQuantity,
          quantityReturned,
          status,
          success: true,
        });
      } catch (itemError) {
        console.error(`❌ Error reversing stock for ${item.productName}:`, itemError.message);
        results.push({
          productId: item.productId,
          productName: item.productName,
          success: false,
          error: itemError.message,
        });
      }
    }

    console.log(`✅ Stock reversal completed for order ${order.orderNumber}`);
    return results;
  } catch (error) {
    console.error(`❌ Error in reverseStockUpdate:`, error);
    throw error;
  }
};

/**
 * Sync OnlineProduct variant stock quantities for products that use this inventory item
 * @param {String} inventoryItemId - Inventory Item ID
 */
const syncOnlineProductStock = async (inventoryItemId) => {
  try {
    // Get current inventory quantity FIRST
    const inventoryItem = await prisma.item.findUnique({
      where: { id: inventoryItemId },
      select: { quantity: true, itemName: true },
    });
    
    if (!inventoryItem) {
      console.error(`⚠️ Inventory item not found: ${inventoryItemId}`);
      return;
    }
    
    const newStock = inventoryItem.quantity;
    console.log(`🔄 Syncing OnlineProduct for inventory item: ${inventoryItem.itemName} (Stock: ${newStock})`);
    
    // Find all online products
    const onlineProducts = await prisma.onlineProduct.findMany({});
    
    for (const onlineProduct of onlineProducts) {
      // Check if any variant uses this inventory item
      let hasVariant = false;
      let updatedVariants = [...onlineProduct.variants];
      
      // Update variant quantities that use this inventory item
      for (let i = 0; i < updatedVariants.length; i++) {
        const variant = updatedVariants[i];
        if (variant.inventoryProductId === inventoryItemId) {
          hasVariant = true;
          
          // ✅ Get PREVIOUS stock from variant BEFORE updating
          const previousStock = variant.variantStockQuantity || 0;
          
          console.log(`   📦 Variant ${i}: ${variant.variantName} - Stock: ${previousStock} → ${newStock}`);
          
          // Update variant stock quantity to match inventory
          updatedVariants[i] = {
            ...variant,
            variantStockQuantity: newStock,
            variantStockStatus: newStock === 0 
              ? "out-of-stock" 
              : newStock <= (variant.variantLowStockAlert || 10)
              ? "low-stock"
              : "in-stock"
          };
          
          // ✅ Check if item was out of stock and is now back in stock
          if (previousStock === 0 && newStock > 0) {
            console.log(`📦 [Back in Stock] ${onlineProduct.shortDescription} - Variant ${i} (${variant.variantName})`);
            console.log(`   Previous: ${previousStock}, New: ${newStock}`);
            
            // Send back in stock notifications to users with this in wishlist
            try {
              const result = await checkWishlistBackInStock(onlineProduct.id, i, newStock);
              console.log(`   ✅ Back in stock check completed:`, result);
            } catch (notifError) {
              console.error('   ⚠️ Failed to send back in stock notifications:', notifError.message);
            }
          }
        }
      }
      
      if (hasVariant) {
        // Update online product with new variant data
        await prisma.onlineProduct.update({
          where: { id: onlineProduct.id },
          data: {
            variants: updatedVariants,
          },
        });
        
        console.log(`✅ OnlineProduct synced: ${onlineProduct.shortDescription} → Variants updated`);
      }
    }
  } catch (error) {
    console.error(`⚠️ Failed to sync OnlineProduct:`, error.message);
    console.error('Stack:', error.stack);
  }
};

module.exports = {
  updateStockAfterOrder,
  updateStockAfterAdjustment,
  reverseStockUpdate,
  syncOnlineProductStock,
};
