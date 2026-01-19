const { prisma } = require('../../config/database');
const { getPresignedUrl } = require('../../utils/online/uploadS3');

/**
 * Helper function to convert image key to presigned URL
 */
const getImageUrl = async (imageKey) => {
  if (!imageKey) return null;
  try {
    return await getPresignedUrl(imageKey, 3600);
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    return null;
  }
};

/**
 * Helper function to find product by inventory product ID
 */
const findProductByInventoryId = async (inventoryProductId, allProducts = null) => {
  let products = allProducts;
  
  if (!products) {
    products = await prisma.onlineProduct.findMany();
  }
  
  const product = products.find(p => 
    p.variants && Array.isArray(p.variants) && 
    p.variants.some(v => v.inventoryProductId === inventoryProductId)
  );
  
  if (!product) return null;
  
  const variantIndex = product.variants.findIndex(
    v => v.inventoryProductId === inventoryProductId
  );
  
  return {
    product,
    variant: product.variants[variantIndex],
    variantIndex
  };
};

/**
 * Get user's cart
 * GET /api/online/cart
 */
const getCart = async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Find customer
    const customer = await prisma.customer.findUnique({
      where: { userId },
      include: {
        cartItems: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) {
      return res.json({
        success: true,
        data: [],
        totalItems: 0,
        totalPrice: 0,
        totalSavings: 0
      });
    }

    // Convert image keys to presigned URLs
    const cartItemsWithUrls = await Promise.all(
      customer.cartItems.map(async (item) => {
        const imageUrl = await getImageUrl(item.variantImage);
        return {
          ...item,
          variantImage: imageUrl || item.variantImage
        };
      })
    );

    // Calculate totals
    const totalItems = cartItemsWithUrls.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cartItemsWithUrls.reduce(
      (sum, item) => sum + (item.variantSellingPrice * item.quantity),
      0
    );
    const totalSavings = cartItemsWithUrls.reduce(
      (sum, item) => sum + ((item.variantMRP - item.variantSellingPrice) * item.quantity),
      0
    );

    res.json({
      success: true,
      data: cartItemsWithUrls,
      totalItems,
      totalPrice,
      totalSavings
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cart',
      message: error.message
    });
  }
};

/**
 * Add item to cart
 * POST /api/online/cart
 */
const addToCart = async (req, res) => {
  try {
    const { userId, inventoryProductId, quantity = 1, selectedCuttingStyle } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!inventoryProductId) {
      return res.status(400).json({
        success: false,
        error: 'inventoryProductId is required'
      });
    }

    // Find customer
    const customer = await prisma.customer.findUnique({
      where: { userId }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found. Please ensure user is registered.'
      });
    }

    // Find the product with this variant
    const result = await findProductByInventoryId(inventoryProductId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const { product, variant, variantIndex } = result;

    // Check stock availability
    if (!variant || variant.variantStockQuantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Variant stock information not available'
      });
    }

    if (variant.variantStockQuantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Item is out of stock'
      });
    }

    // Check if item already exists in cart with SAME cutting style
    const existingItem = await prisma.cart.findFirst({
      where: {
        customerId: customer.id,
        inventoryProductId,
        selectedCuttingStyle: selectedCuttingStyle || null
      }
    });

    let cartItem;

    if (existingItem) {
      // Update quantity for same variant + same cutting style
      const newQuantity = existingItem.quantity + quantity;
      
      // Validate against stock
      const allItemsForVariant = await prisma.cart.findMany({
        where: {
          customerId: customer.id,
          inventoryProductId
        }
      });
      const totalQuantityForVariant = allItemsForVariant.reduce((sum, item) => sum + item.quantity, 0) - existingItem.quantity + newQuantity;
      
      if (totalQuantityForVariant > variant.variantStockQuantity) {
        return res.status(400).json({
          success: false,
          error: `Only ${variant.variantStockQuantity} items available in stock`
        });
      }

      const imageKey = variant.variantImages?.[0] || null;

      cartItem = await prisma.cart.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          maxStock: variant.variantStockQuantity,
          variantSellingPrice: variant.variantSellingPrice,
          variantMRP: variant.variantMRP,
          variantImage: imageKey,
          customerId: customer.id
        }
      });
    } else {
      // Check total stock for this variant
      const allItemsForVariant = await prisma.cart.findMany({
        where: {
          customerId: customer.id,
          inventoryProductId
        }
      });
      const totalQuantityForVariant = allItemsForVariant.reduce((sum, item) => sum + item.quantity, 0) + quantity;
      
      if (totalQuantityForVariant > variant.variantStockQuantity) {
        return res.status(400).json({
          success: false,
          error: `Only ${variant.variantStockQuantity} items available in stock`
        });
      }

      const imageKey = variant.variantImages?.[0] || null;

      // Create new cart item
      cartItem = await prisma.cart.create({
        data: {
          userId,
          customerId: customer.id,
          inventoryProductId,
          productId: product.id,
          variantIndex,
          quantity,
          maxStock: variant.variantStockQuantity,
          shortDescription: product.shortDescription,
          brand: product.brand,
          variantName: variant.variantName,
          displayName: variant.displayName || variant.variantName,
          variantSellingPrice: variant.variantSellingPrice,
          variantMRP: variant.variantMRP,
          variantImage: imageKey,
          selectedCuttingStyle
        }
      });
    }

    res.json({
      success: true,
      data: cartItem,
      message: 'Item added to cart'
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item to cart',
      message: error.message
    });
  }
};

/**
 * Update cart item quantity
 * PUT /api/online/cart/:inventoryProductId
 */
const updateCartItem = async (req, res) => {
  try {
    const { userId, selectedCuttingStyle } = req.body;
    const { inventoryProductId } = req.params;
    const { quantity } = req.body;

    console.log('[updateCartItem] Request:', {
      userId,
      inventoryProductId,
      quantity,
      selectedCuttingStyle
    });

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid quantity is required'
      });
    }

    // Find customer
    const customer = await prisma.customer.findUnique({
      where: { userId }
    });

    console.log('[updateCartItem] Customer found:', customer?.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // If quantity is 0, remove the item
    if (quantity === 0) {
      await prisma.cart.deleteMany({
        where: {
          customerId: customer.id,
          inventoryProductId,
          selectedCuttingStyle: selectedCuttingStyle || null
        }
      });

      return res.json({
        success: true,
        message: 'Item removed from cart'
      });
    }

    // Find the cart item using a more robust lookup
    // We fetch all items for this product and filter in memory to handle 
    // inconsistencies between null/undefined/empty string in selectedCuttingStyle
    const candidates = await prisma.cart.findMany({
      where: {
        customerId: customer.id,
        inventoryProductId
      }
    });

    // Try finding match treating null/undefined/"" as equivalent
    const targetStyle = selectedCuttingStyle || null;
    
    const existingItem = candidates.find(item => {
      const itemStyle = item.selectedCuttingStyle || null;
      return itemStyle === targetStyle;
    });

      console.log('[updateCartItem] Existing item found:', existingItem?.id);

    if (!existingItem) {
      console.log('[updateCartItem] Cart item not found in candidates. Debugging...');
      console.log('[updateCartItem] Query params:', {
          customerId: customer.id,
          inventoryProductId,
          selectedCuttingStyle: selectedCuttingStyle || null
      });
      
      console.log('[updateCartItem] Candidates found:', candidates.map(item => ({
        id: item.id,
        inventoryProductId: item.inventoryProductId,
        selectedCuttingStyle: item.selectedCuttingStyle || '(falsy)',
        matchesTarget: (item.selectedCuttingStyle || null) === (selectedCuttingStyle || null)
      })));
      
      // Fallback search to see what else is there (if candidates was empty)
      if (candidates.length === 0) {
          const allCartItems = await prisma.cart.findMany({
            where: { customerId: customer.id }
          });
          console.log('[updateCartItem] All cart items for user:', allCartItems.length);
      }
      
      return res.status(404).json({
        success: false,
        error: 'Cart item not found',
        debug: {
            message: 'Item not found in candidates',
            searchedFor: { inventoryProductId, selectedCuttingStyle: selectedCuttingStyle || null },
            candidatesCount: candidates.length,
            candidates: candidates.map(item => ({
              id: item.id,
              selectedCuttingStyle: item.selectedCuttingStyle
            }))
        }
      });
    }

    // Get current stock from product
    const product = await prisma.onlineProduct.findUnique({
      where: { id: existingItem.productId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const variant = product.variants[existingItem.variantIndex];
    const availableStock = variant?.variantStockQuantity || 0;

    // Validate against stock
    const allItemsForVariant = await prisma.cart.findMany({
      where: {
        customerId: customer.id,
        inventoryProductId
      }
    });
    const totalQuantityForVariant = allItemsForVariant.reduce((sum, item) => sum + item.quantity, 0) - existingItem.quantity + quantity;
    
    if (totalQuantityForVariant > availableStock) {
      return res.status(400).json({
        success: false,
        error: `Only ${availableStock} items available in stock`
      });
    }

    const imageKey = variant?.variantImages?.[0] || null;

    // Update cart item
    const cartItem = await prisma.cart.update({
      where: { id: existingItem.id },
      data: {
        quantity,
        maxStock: availableStock,
        variantSellingPrice: variant.variantSellingPrice,
        variantMRP: variant.variantMRP,
        variantImage: imageKey
      }
    });

    console.log('[updateCartItem] Cart item updated successfully');

    res.json({
      success: true,
      data: cartItem,
      message: 'Cart item updated'
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cart item',
      message: error.message
    });
  }
};

/**
 * Remove item from cart
 * DELETE /api/online/cart/:inventoryProductId
 */
const removeFromCart = async (req, res) => {
  try {
    const userId = req.query.userId || req.body?.userId;
    const selectedCuttingStyle = req.query.selectedCuttingStyle || req.body?.selectedCuttingStyle || null;
    const { inventoryProductId } = req.params;

    console.log('Remove from cart request:', { userId, inventoryProductId, selectedCuttingStyle });

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!inventoryProductId) {
      return res.status(400).json({
        success: false,
        error: 'Inventory Product ID is required'
      });
    }

    // Find customer
    const customer = await prisma.customer.findUnique({
      where: { userId }
    });

    console.log('Customer found:', customer?.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Build where clause
    const whereClause = {
      customerId: customer.id,
      inventoryProductId: inventoryProductId
    };

    // Only add selectedCuttingStyle to where clause if it's provided
    if (selectedCuttingStyle) {
      whereClause.selectedCuttingStyle = selectedCuttingStyle;
    }

    console.log('Delete where clause:', whereClause);

    const deleteResult = await prisma.cart.deleteMany({
      where: whereClause
    });

    console.log('Delete result:', deleteResult);

    res.json({
      success: true,
      message: 'Item removed from cart',
      deletedCount: deleteResult.count
    });
  } catch (error) {
    console.error('Error removing from cart - Full error:', error);
    console.error('Error stack:', error.stack);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to remove item from cart',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Clear entire cart
 * DELETE /api/online/cart
 */
const clearCart = async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Find customer
    const customer = await prisma.customer.findUnique({
      where: { userId }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const result = await prisma.cart.deleteMany({
      where: { userId }
    });

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        removedCount: result.count
      }
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cart',
      message: error.message
    });
  }
};

/**
 * Sync local cart to database (on login)
 * POST /api/online/cart/sync
 */
const syncCart = async (req, res) => {
  try {
    const { userId, items } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required'
      });
    }

    // Find customer
    const customer = await prisma.customer.findUnique({
      where: { userId }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found. Please ensure user is registered.'
      });
    }

    // Fetch all products once for efficiency
    const allProducts = await prisma.onlineProduct.findMany();

    // Process each item from local cart
    for (const item of items) {
      const { inventoryProductId, quantity, selectedCuttingStyle } = item;

      if (!inventoryProductId || !quantity) continue;

      // Find the product with this variant
      const result = await findProductByInventoryId(inventoryProductId, allProducts);

      if (!result) continue;

      const { product, variant, variantIndex } = result;

      // Check stock availability
      const availableStock = variant.variantStockQuantity || 0;
      if (availableStock <= 0) continue;

      // Check if item already exists in cart
      const existingItem = await prisma.cart.findFirst({
        where: {
          customerId: customer.id,
          inventoryProductId,
          selectedCuttingStyle: selectedCuttingStyle || null
        }
      });

      if (existingItem) {
        // Merge quantities
        const allItemsForVariant = await prisma.cart.findMany({
          where: {
            customerId: customer.id,
            inventoryProductId
          }
        });
        const otherItemsQuantity = allItemsForVariant.reduce((sum, item) => 
          item.id !== existingItem.id ? sum + item.quantity : sum, 0
        );
        const maxAllowedForThis = availableStock - otherItemsQuantity;
        
        const mergedQuantity = Math.min(
          Math.max(existingItem.quantity, quantity),
          maxAllowedForThis
        );

        const imageKey = variant.variantImages?.[0] || null;

        await prisma.cart.update({
          where: { id: existingItem.id },
          data: {
            quantity: mergedQuantity,
            maxStock: availableStock,
            variantSellingPrice: variant.variantSellingPrice,
            variantMRP: variant.variantMRP,
            variantImage: imageKey,
            customerId: customer.id
          }
        });
      } else {
        // Check total stock
        const allItemsForVariant = await prisma.cart.findMany({
          where: {
            customerId: customer.id,
            inventoryProductId
          }
        });
        const totalQuantityForVariant = allItemsForVariant.reduce((sum, item) => sum + item.quantity, 0);
        const maxAllowedForNew = availableStock - totalQuantityForVariant;
        
        if (maxAllowedForNew <= 0) continue;
        
        const validQuantity = Math.min(quantity, maxAllowedForNew);
        const imageKey = variant.variantImages?.[0] || null;

        await prisma.cart.create({
          data: {
            userId,
            customerId: customer.id,
            inventoryProductId,
            productId: product.id,
            variantIndex,
            quantity: validQuantity,
            maxStock: availableStock,
            shortDescription: product.shortDescription,
            brand: product.brand,
            variantName: variant.variantName,
            displayName: variant.displayName || variant.variantName,
            variantSellingPrice: variant.variantSellingPrice,
            variantMRP: variant.variantMRP,
            variantImage: imageKey,
            selectedCuttingStyle
          }
        });
      }
    }

    // Return updated cart
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Convert image keys to presigned URLs
    const cartItemsWithUrls = await Promise.all(
      cartItems.map(async (item) => {
        const imageUrl = await getImageUrl(item.variantImage);
        return {
          ...item,
          variantImage: imageUrl || item.variantImage
        };
      })
    );

    const totalItems = cartItemsWithUrls.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cartItemsWithUrls.reduce(
      (sum, item) => sum + (item.variantSellingPrice * item.quantity),
      0
    );
    const totalSavings = cartItemsWithUrls.reduce(
      (sum, item) => sum + ((item.variantMRP - item.variantSellingPrice) * item.quantity),
      0
    );

    res.json({
      success: true,
      data: cartItemsWithUrls,
      totalItems,
      totalPrice,
      totalSavings,
      message: 'Cart synced successfully'
    });
  } catch (error) {
    console.error('Error syncing cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync cart',
      message: error.message
    });
  }
};



module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart,

};
