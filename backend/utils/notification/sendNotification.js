const { getMessaging } = require('../firebase/firebaseAdmin');
const { prisma } = require('../../config/database');

/**
 * Get company logo from WebSettings
 */
const getCompanyLogo = async () => {
  try {
    const webSettings = await prisma.webSettings.findFirst({
      select: { logoUrl: true },
    });
    
    if (webSettings?.logoUrl) {
      // logoUrl field contains the S3 key, use the proxy endpoint
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      return `${backendUrl}/api/web/web-settings/logo`;
    }
    
    // Fallback to default logo from frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${frontendUrl}/logo.jpeg`;
  } catch (error) {
    console.error('❌ Error fetching company logo:', error);
    // Fallback to default logo
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${frontendUrl}/logo.jpeg`;
  }
};

/**
 * Send notification to a single user/admin
 * @param {string} fcmToken - FCM device token
 * @param {object} notification - Notification payload
 * @param {object} data - Additional data payload
 */
const sendToDevice = async (fcmToken, notification, data = {}) => {
  try {
    if (!fcmToken) {
      console.log('⚠️ No FCM token provided');
      return { success: false, error: 'No FCM token' };
    }

    const messaging = getMessaging();
    
    // Get company logo
    const logoUrl = await getCompanyLogo();
    console.log('📷 Using logo URL for notification:', logoUrl);
    
    // Convert all data values to strings (FCM requirement)
    const stringifiedData = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object') {
        stringifiedData[key] = JSON.stringify(value);
      } else {
        stringifiedData[key] = String(value);
      }
    }
    
    // Add logo URL to data
    stringifiedData.logoUrl = logoUrl;
    stringifiedData.notificationType = data.type || 'general';
    
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.image && { image: notification.image }),
      },
      data: stringifiedData,
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: logoUrl, // Use company logo
          badge: logoUrl, // Use company logo
          ...(notification.image && { image: notification.image }),
          // Enhanced visual options
          requireInteraction: data.requireInteraction !== false, // Keep notification visible
          vibrate: data.vibrate || [200, 100, 200], // Vibration pattern
          timestamp: Date.now(),
          // Action buttons
          ...(data.actions && { actions: data.actions }),
        },
        fcmOptions: {
          link: data.link || '/',
        },
        // Custom headers for better delivery
        headers: {
          Urgency: data.urgency || 'high',
          TTL: '86400', // 24 hours
        },
      },
    };

    const response = await messaging.send(message);
    console.log('✅ Notification sent successfully:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Error sending notification:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to user by userId
 */
const sendToUser = async (userId, notification, data = {}) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true, name: true, email: true },
    });

    if (!user || !user.fcmToken) {
      console.log(`⚠️ User ${userId} has no FCM token`);
      return { success: false, error: 'User has no FCM token' };
    }

    console.log(`📤 Sending notification to user: ${user.name} (${user.email})`);
    return await sendToDevice(user.fcmToken, notification, data);
  } catch (error) {
    console.error('❌ Error sending notification to user:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to admin by adminId
 */
const sendToAdmin = async (adminId, notification, data = {}) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { fcmToken: true, name: true, email: true },
    });

    if (!admin || !admin.fcmToken) {
      console.log(`⚠️ Admin ${adminId} has no FCM token`);
      return { success: false, error: 'Admin has no FCM token' };
    }

    console.log(`📤 Sending notification to admin: ${admin.name} (${admin.email})`);
    return await sendToDevice(admin.fcmToken, notification, data);
  } catch (error) {
    console.error('❌ Error sending notification to admin:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to all admins
 */
const sendToAllAdmins = async (notification, data = {}) => {
  try {
    const admins = await prisma.admin.findMany({
      where: {
        fcmToken: { not: null },
        isActive: true,
      },
      select: { fcmToken: true, name: true },
    });

    if (admins.length === 0) {
      console.log('⚠️ No admins with FCM tokens found');
      return { success: false, error: 'No admins with FCM tokens' };
    }

    console.log(`📤 Sending notification to ${admins.length} admins`);

    const results = await Promise.allSettled(
      admins.map((admin) => sendToDevice(admin.fcmToken, notification, data))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    console.log(`✅ Sent to ${successCount}/${admins.length} admins`);

    return { success: true, sent: successCount, total: admins.length };
  } catch (error) {
    console.error('❌ Error sending notification to admins:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send low stock or out of stock alert to all admins
 */
const sendLowStockAlert = async (itemName, currentStock, alertLevel, warehouseName) => {
  // Determine if it's out of stock or low stock
  const isOutOfStock = currentStock === 0;
  
  const notification = {
    title: isOutOfStock ? '🚨 Out of Stock Alert' : '⚠️ Low Stock Alert',
    body: isOutOfStock 
      ? `${itemName} is out of stock!\n📦 Current: ${currentStock} | 🔔 Alert Level: ${alertLevel}\n🏢 ${warehouseName}\n\n⚠️ Immediate restocking required!`
      : `${itemName} is running low!\n📦 Current: ${currentStock} | 🔔 Alert Level: ${alertLevel}\n🏢 ${warehouseName}`,
  };

  const data = {
    type: isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK',
    itemName,
    currentStock: currentStock.toString(),
    alertLevel: alertLevel.toString(),
    warehouse: warehouseName,
    link: '/dashboard/inventory-management', // Correct link from sidebar
    urgency: 'high',
    vibrate: isOutOfStock ? [400, 100, 400, 100, 400, 100, 400] : [300, 100, 300, 100, 300], // More urgent for out of stock
    requireInteraction: true, // Keep visible until dismissed
    color: isOutOfStock ? '#F44336' : '#FF9800', // Red for out of stock, Orange for low stock
    backgroundColor: isOutOfStock ? '#FFEBEE' : '#FFF3E0', // Light red or light orange
    actions: [
      {
        action: 'view',
        title: '👁️ View Inventory',
      },
      {
        action: 'dismiss',
        title: '✖️ Dismiss',
      },
    ],
  };

  return await sendToAllAdmins(notification, data);
};

/**
 * Send order status update to user
 */
const sendOrderStatusUpdate = async (userId, orderNumber, status, statusMessage) => {
  const statusEmojis = {
    pending: '⏳',
    confirmed: '✅',
    packing: '📦',
    shipped: '🚚',
    delivered: '🎉',
    cancelled: '❌',
  };

  const statusColors = {
    pending: '#FFA500',
    confirmed: '#4CAF50',
    packing: '#2196F3',
    shipped: '#9C27B0',
    delivered: '#4CAF50',
    cancelled: '#F44336',
  };

  const statusBackgrounds = {
    pending: '#FFF3E0',
    confirmed: '#E8F5E9',
    packing: '#E3F2FD',
    shipped: '#F3E5F5',
    delivered: '#E8F5E9',
    cancelled: '#FFEBEE',
  };

  const notification = {
    title: `${statusEmojis[status] || '📦'} Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    body: statusMessage || `Your order #${orderNumber} is now ${status}\n\nTrack your order for real-time updates!`,
  };

  const data = {
    type: 'ORDER_UPDATE',
    orderNumber,
    status,
    color: statusColors[status],
    backgroundColor: statusBackgrounds[status],
    link: '/orders', // User orders page (frontend route)
    urgency: status === 'delivered' ? 'high' : 'normal',
    vibrate: status === 'delivered' ? [200, 100, 200, 100, 200] : [200, 100, 200],
    requireInteraction: status === 'delivered' || status === 'cancelled',
    actions: [
      {
        action: 'view',
        title: '📱 Track Order',
      },
      {
        action: 'dismiss',
        title: '✖️ Close',
      },
    ],
  };

  return await sendToUser(userId, notification, data);
};

/**
 * Send order placed confirmation to user
 */
const sendOrderPlacedNotification = async (userId, orderNumber, total) => {
  const notification = {
    title: '🎉 Order Placed Successfully!',
    body: `Thank you for your order!\n\n💰 Amount: ₹${total.toFixed(2)}\n📦 Order #${orderNumber}\n\nWe'll notify you once it's confirmed!`,
  };

  const data = {
    type: 'ORDER_PLACED',
    orderNumber,
    total: total.toString(),
    link: '/orders', // User orders page (frontend route)
    urgency: 'high',
    vibrate: [200, 100, 200, 100, 200, 100, 200], // Celebration vibration
    requireInteraction: true,
    color: '#4CAF50', // Green for success
    backgroundColor: '#E8F5E9', // Light green background
    actions: [
      {
        action: 'view',
        title: '👁️ View Order',
      },
      {
        action: 'share',
        title: '📤 Share',
      },
    ],
  };

  return await sendToUser(userId, notification, data);
};

/**
 * Send new user registration notification to all admins
 */
const sendNewUserRegistrationAlert = async (userName, userEmail, customerId) => {
  const notification = {
    title: '👤 New User Registered',
    body: `Welcome ${userName}!\n\n📧 ${userEmail}\n\nA new customer has joined your platform. Check their profile now!`,
  };

  const data = {
    type: 'NEW_USER_REGISTRATION',
    userName,
    userEmail,
    customerId: customerId || '',
    link: customerId 
      ? `/dashboard/customer-management/view/${customerId}` 
      : '/dashboard/customer-management', // Direct link to customer profile
    urgency: 'normal',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    color: '#2196F3', // Blue for info
    backgroundColor: '#E3F2FD', // Light blue background
    actions: [
      {
        action: 'view',
        title: '👁️ View Profile',
      },
      {
        action: 'dismiss',
        title: '✖️ Dismiss',
      },
    ],
  };

  return await sendToAllAdmins(notification, data);
};

/**
 * Send welcome notification to newly registered user
 */
const sendWelcomeNotification = async (userId, userName) => {
  const notification = {
    title: '🎉 Welcome to Our Platform!',
    body: `Hi ${userName}!\n\nThank you for joining us. We're excited to have you here!\n\n🛍️ Start exploring our products\n🎁 Check out exclusive deals\n📦 Track your orders easily`,
  };

  const data = {
    type: 'WELCOME',
    userName,
    link: '/', // Home page
    urgency: 'normal',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    color: '#9C27B0', // Purple for celebration
    backgroundColor: '#F3E5F5', // Light purple background
    actions: [
      {
        action: 'view',
        title: '🛍️ Start Shopping',
      },
      {
        action: 'dismiss',
        title: '✖️ Close',
      },
    ],
  };

  return await sendToUser(userId, notification, data);
};

module.exports = {
  sendToDevice,
  sendToUser,
  sendToAdmin,
  sendToAllAdmins,
  sendLowStockAlert,
  sendOrderStatusUpdate,
  sendOrderPlacedNotification,
  sendNewUserRegistrationAlert,
  sendWelcomeNotification,
};
