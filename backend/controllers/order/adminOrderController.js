const { prisma } = require('../../config/database');
const { generateInvoicePDF, getCompanyData } = require('../../utils/order/invoicePDFGenerator');
const { sendOrderStatusUpdate, sendOutForDeliveryNotification } = require('../../utils/notification/sendNotification');

/**
 * Get all online orders with filters and pagination
 * GET /api/online/admin/orders
 */
const getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      paymentStatus,
      paymentMethod,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build filter conditions
    const where = {};

    if (status) {
      where.orderStatus = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      prisma.onlineOrder.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          orderNumber: true,
          invoiceNumber: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          items: true,
          subtotal: true,
          tax: true,
          discount: true,
          couponDiscount: true,
          shippingCharge: true,
          total: true,
          paymentMethod: true,
          paymentStatus: true,
          orderStatus: true,
          createdAt: true,
          updatedAt: true,
          confirmedAt: true,
          shippedAt: true,
          deliveredAt: true,
          cancelledAt: true,
        }
      }),
      prisma.onlineOrder.count({ where })
    ]);

    // Calculate summary statistics
    const summary = await prisma.onlineOrder.aggregate({
      where,
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      }
    });

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      summary: {
        totalOrders: summary._count.id,
        totalRevenue: summary._sum.total || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
};

/**
 * Get single order by ID
 * GET /api/online/admin/orders/:id
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.onlineOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order',
      message: error.message
    });
  }
};

/**
 * Update order status
 * PATCH /api/online/admin/orders/:id/status
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'packing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await prisma.onlineOrder.findUnique({
      where: { id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Prepare update data
    const updateData = {
      orderStatus: status,
    };

    // Set timestamp based on status
    const now = new Date();
    if (status === 'confirmed' && !order.confirmedAt) {
      updateData.confirmedAt = now;
    } else if (status === 'packing' && !order.packingAt) {
      updateData.packingAt = now;
    } else if (status === 'shipped' && !order.shippedAt) {
      updateData.shippedAt = now;
    } else if (status === 'delivered' && !order.deliveredAt) {
      updateData.deliveredAt = now;
    } else if (status === 'cancelled' && !order.cancelledAt) {
      updateData.cancelledAt = now;
    }

    // Update order
    const updatedOrder = await prisma.onlineOrder.update({
      where: { id },
      data: updateData
    });

    // Send order status update notification to user
    try {
      console.log('🔔 Preparing to send order status notification to user');
      console.log('📊 Order details:', {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        userId: updatedOrder.userId,
        customerId: updatedOrder.customerId,
        customerName: updatedOrder.customerName,
        status: status
      });

      const statusMessages = {
        pending: 'Your order is pending confirmation',
        confirmed: 'Your order has been confirmed and will be processed soon',
        packing: 'Your order is being packed',
        shipped: 'Your order has been shipped and is on the way',
        delivered: 'Your order has been delivered successfully',
        cancelled: 'Your order has been cancelled',
      };

      // Verify user exists and has FCM tokens
      const user = await prisma.user.findUnique({
        where: { id: updatedOrder.userId },
        select: { id: true, name: true, email: true, fcmTokens: true }
      });

      if (!user) {
        console.error(`❌ User not found with ID: ${updatedOrder.userId}`);
      } else {
        console.log(`✅ User found: ${user.name} (${user.email})`);
        console.log(`📱 User has ${user.fcmTokens?.length || 0} FCM token(s)`);
        if (user.fcmTokens && user.fcmTokens.length > 0) {
          console.log('📱 FCM Tokens:', user.fcmTokens.map(t => ({
            device: t.device,
            token: t.token?.substring(0, 20) + '...',
            lastUsed: t.lastUsed
          })));
        }
      }

      const notificationResult = await sendOrderStatusUpdate(
        updatedOrder.userId,
        updatedOrder.orderNumber,
        status,
        statusMessages[status]
      );
      
      console.log(`📱 Order status notification result:`, notificationResult);
      
      // ✅ Send "Out for Delivery" notification when order is shipped
      if (status === 'shipped' && updatedOrder.deliveryPartnerId) {
        try {
          console.log('🚚 Order shipped - checking for delivery partner...');
          
          // Get delivery partner details
          const deliveryPartner = await prisma.deliveryPartner.findUnique({
            where: { id: updatedOrder.deliveryPartnerId },
            select: {
              name: true,
              phone: true,
            },
          });
          
          if (deliveryPartner) {
            console.log(`📦 Delivery partner found: ${deliveryPartner.name}`);
            
            // Send out for delivery notification
            const deliveryNotifResult = await sendOutForDeliveryNotification(
              updatedOrder.userId,
              updatedOrder.orderNumber,
              deliveryPartner.name,
              deliveryPartner.phone,
              updatedOrder.estimatedDeliveryTime || 'Soon'
            );
            
            console.log(`🚚 Out for delivery notification result:`, deliveryNotifResult);
          } else {
            console.log('⚠️ Delivery partner not found for this order');
          }
        } catch (deliveryNotifError) {
          console.error(`⚠️ Failed to send out for delivery notification:`, deliveryNotifError.message);
        }
      }
    } catch (notifError) {
      console.error(`⚠️ Failed to send order status notification:`, notifError.message);
      console.error('Stack:', notifError.stack);
    }

    // Send notification to all admins about order status change - DISABLED as per requirement
    /*
    try {
      const { sendToAllAdmins } = require('../../utils/notification/sendNotification');
      
      const adminStatusMessages = {
        pending: `Order #${updatedOrder.orderNumber} is pending`,
        confirmed: `Order #${updatedOrder.orderNumber} has been confirmed`,
        packing: `Order #${updatedOrder.orderNumber} is being packed`,
        shipped: `Order #${updatedOrder.orderNumber} has been shipped`,
        delivered: `Order #${updatedOrder.orderNumber} has been delivered`,
        cancelled: `Order #${updatedOrder.orderNumber} has been cancelled`,
      };

      const adminNotification = {
        title: `📦 Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        body: `${adminStatusMessages[status]}\n\n👤 Customer: ${updatedOrder.customerName}\n💰 Amount: ₹${updatedOrder.total.toFixed(2)}`,
      };

      const adminData = {
        type: 'ADMIN_ORDER_UPDATE',
        orderNumber: updatedOrder.orderNumber,
        orderId: updatedOrder.id,
        status,
        customerName: updatedOrder.customerName,
        total: updatedOrder.total.toString(),
        link: `/dashboard/order-management/online-orders/${updatedOrder.id}`,
        urgency: 'normal',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        color: '#2196F3',
        backgroundColor: '#E3F2FD',
      };

      await sendToAllAdmins(adminNotification, adminData);
      console.log(`📱 Order status notification sent to all admins`);
    } catch (adminNotifError) {
      console.error(`⚠️ Failed to send admin notification:`, adminNotifError.message);
    }
    */

    res.json({
      success: true,
      data: updatedOrder,
      message: `Order status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status',
      message: error.message
    });
  }
};

/**
 * Get order statistics
 * GET /api/online/admin/orders/stats
 */
const getOrderStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get counts by status
    const statusCounts = await prisma.onlineOrder.groupBy({
      by: ['orderStatus'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        total: true,
      }
    });

    // Get counts by payment status
    const paymentCounts = await prisma.onlineOrder.groupBy({
      by: ['paymentStatus'],
      where,
      _count: {
        id: true,
      }
    });

    // Get total revenue
    const revenue = await prisma.onlineOrder.aggregate({
      where: {
        ...where,
        paymentStatus: 'completed',
      },
      _sum: {
        total: true,
      }
    });

    res.json({
      success: true,
      data: {
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item.orderStatus] = {
            count: item._count.id,
            revenue: item._sum.total || 0,
          };
          return acc;
        }, {}),
        byPaymentStatus: paymentCounts.reduce((acc, item) => {
          acc[item.paymentStatus] = item._count.id;
          return acc;
        }, {}),
        totalRevenue: revenue._sum.total || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order statistics',
      message: error.message
    });
  }
};

/**
 * Download order invoice PDF (Admin)
 * GET /api/online/admin/orders/:orderNumber/invoice/download
 */
const downloadOrderInvoice = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    console.log(`📄 Admin invoice download requested for order: ${orderNumber}`);

    // Find the order by order number
    const order = await prisma.onlineOrder.findFirst({
      where: {
        orderNumber: orderNumber
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log(`📄 Order found: ${order.orderNumber}, Status: ${order.orderStatus}`);

    // Get company data
    const companyData = await getCompanyData();

    // Prepare order data for PDF generation
    const orderData = {
      ...order,
      items: order.items || [],
      deliveryAddress: order.deliveryAddress || {},
      createdAt: order.createdAt,
      invoiceNumber: order.invoiceNumber || order.orderNumber
    };

    console.log(`📄 Generating PDF for admin download: ${orderNumber}`);

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(orderData, companyData);

    console.log(`📄 PDF generated successfully for admin download: ${orderNumber}`);

    // Set response headers for PDF download
    const filename = `invoice-${orderNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating admin invoice PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice PDF',
      error: error.message
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
  downloadOrderInvoice,
};
