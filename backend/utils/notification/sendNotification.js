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
 * Send notification to user by userId (Multi-device support)
 */
const sendToUser = async (userId, notification, data = {}) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmTokens: true, name: true, email: true },
    });

    if (!user) {
      console.log(`⚠️ User ${userId} not found`);
      return { success: false, error: 'User not found' };
    }

    const tokens = Array.isArray(user.fcmTokens) ? user.fcmTokens : [];

    if (tokens.length === 0) {
      console.log(`⚠️ User ${user.name} has no FCM tokens`);
      return { success: false, error: 'User has no FCM tokens' };
    }

    console.log(`📤 Sending notification to user: ${user.name} (${user.email}) - ${tokens.length} device(s)`);

    // Send to all devices
    const results = await Promise.allSettled(
      tokens.map((tokenObj) => sendToDevice(tokenObj.token, notification, data))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failedTokens = [];

    // Collect failed tokens for cleanup
    results.forEach((result, index) => {
      if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
        failedTokens.push(tokens[index].token);
      }
    });

    // Remove invalid tokens from database
    if (failedTokens.length > 0) {
      const validTokens = tokens.filter(t => !failedTokens.includes(t.token));
      await prisma.user.update({
        where: { id: userId },
        data: { fcmTokens: validTokens },
      });
      console.log(`🧹 Cleaned up ${failedTokens.length} invalid token(s) for user ${user.name}`);
    }

    console.log(`✅ Sent to ${successCount}/${tokens.length} device(s) for user ${user.name}`);

    return { success: true, sent: successCount, total: tokens.length };
  } catch (error) {
    console.error('❌ Error sending notification to user:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to admin by adminId (Multi-device support)
 */
const sendToAdmin = async (adminId, notification, data = {}) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { fcmTokens: true, name: true, email: true },
    });

    if (!admin) {
      console.log(`⚠️ Admin ${adminId} not found`);
      return { success: false, error: 'Admin not found' };
    }

    const tokens = Array.isArray(admin.fcmTokens) ? admin.fcmTokens : [];

    if (tokens.length === 0) {
      console.log(`⚠️ Admin ${admin.name} has no FCM tokens`);
      return { success: false, error: 'Admin has no FCM tokens' };
    }

    console.log(`📤 Sending notification to admin: ${admin.name} (${admin.email}) - ${tokens.length} device(s)`);

    // Send to all devices
    const results = await Promise.allSettled(
      tokens.map((tokenObj) => sendToDevice(tokenObj.token, notification, data))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failedTokens = [];

    // Collect failed tokens for cleanup
    results.forEach((result, index) => {
      if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
        failedTokens.push(tokens[index].token);
      }
    });

    // Remove invalid tokens from database
    if (failedTokens.length > 0) {
      const validTokens = tokens.filter(t => !failedTokens.includes(t.token));
      await prisma.admin.update({
        where: { id: adminId },
        data: { fcmTokens: validTokens },
      });
      console.log(`🧹 Cleaned up ${failedTokens.length} invalid token(s) for admin ${admin.name}`);
    }

    console.log(`✅ Sent to ${successCount}/${tokens.length} device(s) for admin ${admin.name}`);

    return { success: true, sent: successCount, total: tokens.length };
  } catch (error) {
    console.error('❌ Error sending notification to admin:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to all admins (Multi-device support)
 */
const sendToAllAdmins = async (notification, data = {}) => {
  try {
    const admins = await prisma.admin.findMany({
      where: {
        isActive: true,
      },
      select: { id: true, fcmTokens: true, name: true },
    });

    if (admins.length === 0) {
      console.log('⚠️ No active admins found');
      return { success: false, error: 'No active admins' };
    }

    // Collect all tokens from all admins
    const allTokens = [];
    admins.forEach(admin => {
      const tokens = Array.isArray(admin.fcmTokens) ? admin.fcmTokens : [];
      tokens.forEach(tokenObj => {
        allTokens.push({
          adminId: admin.id,
          adminName: admin.name,
          token: tokenObj.token,
        });
      });
    });

    if (allTokens.length === 0) {
      console.log('⚠️ No admins with FCM tokens found');
      return { success: false, error: 'No admins with FCM tokens' };
    }

    console.log(`📤 Sending notification to ${admins.length} admin(s) across ${allTokens.length} device(s)`);

    const results = await Promise.allSettled(
      allTokens.map((item) => sendToDevice(item.token, notification, data))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    
    // Cleanup invalid tokens per admin
    const failedTokensByAdmin = {};
    results.forEach((result, index) => {
      if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
        const adminId = allTokens[index].adminId;
        if (!failedTokensByAdmin[adminId]) {
          failedTokensByAdmin[adminId] = [];
        }
        failedTokensByAdmin[adminId].push(allTokens[index].token);
      }
    });

    // Remove invalid tokens from each admin
    for (const [adminId, failedTokens] of Object.entries(failedTokensByAdmin)) {
      const admin = admins.find(a => a.id === adminId);
      if (admin) {
        const tokens = Array.isArray(admin.fcmTokens) ? admin.fcmTokens : [];
        const validTokens = tokens.filter(t => !failedTokens.includes(t.token));
        await prisma.admin.update({
          where: { id: adminId },
          data: { fcmTokens: validTokens },
        });
        console.log(`🧹 Cleaned up ${failedTokens.length} invalid token(s) for admin ${admin.name}`);
      }
    }

    console.log(`✅ Sent to ${successCount}/${allTokens.length} device(s) across ${admins.length} admin(s)`);

    return { success: true, sent: successCount, total: allTokens.length, admins: admins.length };
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

/**
 * Send expiring product alert to all admins
 */
const sendExpiringProductAlert = async (itemName, expiryDate, daysUntilExpiry, warehouseName, itemId) => {
  // Determine urgency based on days until expiry
  const isUrgent = daysUntilExpiry <= 7;
  const isCritical = daysUntilExpiry <= 3;
  
  // Format expiry date
  const formattedDate = new Date(expiryDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  const notification = {
    title: isCritical ? '🚨 Critical: Product Expiring Soon!' : isUrgent ? '⚠️ Urgent: Product Expiring Soon' : '📅 Product Expiry Alert',
    body: isCritical 
      ? `${itemName} expires in ${daysUntilExpiry} day(s)!\n📅 Expiry: ${formattedDate}\n🏢 ${warehouseName}\n\n🚨 IMMEDIATE ACTION REQUIRED!`
      : `${itemName} expires in ${daysUntilExpiry} day(s)\n📅 Expiry: ${formattedDate}\n🏢 ${warehouseName}\n\n⚠️ Please take action soon`,
  };

  const data = {
    type: isCritical ? 'CRITICAL_EXPIRY' : isUrgent ? 'URGENT_EXPIRY' : 'EXPIRY_WARNING',
    itemName,
    itemId: itemId || '',
    expiryDate: formattedDate,
    daysUntilExpiry: daysUntilExpiry.toString(),
    warehouse: warehouseName,
    link: '/dashboard/inventory-management',
    urgency: isCritical ? 'high' : 'normal',
    vibrate: isCritical ? [400, 100, 400, 100, 400, 100, 400] : [300, 100, 300, 100, 300],
    requireInteraction: isCritical || isUrgent,
    color: isCritical ? '#D32F2F' : isUrgent ? '#F57C00' : '#FFA726',
    backgroundColor: isCritical ? '#FFCDD2' : isUrgent ? '#FFE0B2' : '#FFF3E0',
    actions: [
      {
        action: 'view',
        title: '👁️ View Item',
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
 * Send daily expiry summary to all admins
 */
const sendDailyExpirySummary = async (expirySummary) => {
  const { critical, urgent, upcoming, total } = expirySummary;
  
  if (total === 0) {
    console.log('✅ No expiring products - no summary needed');
    return { success: true, message: 'No expiring products' };
  }

  let summaryBody = `📊 Daily Expiry Report\n\n`;
  summaryBody += `🚨 Critical (≤3 days): ${critical} items\n`;
  summaryBody += `⚠️ Urgent (4-7 days): ${urgent} items\n`;
  summaryBody += `📅 Upcoming (8-30 days): ${upcoming} items\n`;
  summaryBody += `📦 Total Expiring: ${total} items\n\n`;
  
  if (critical > 0) {
    summaryBody += `⚠️ IMMEDIATE ACTION REQUIRED for ${critical} item(s)!`;
  } else if (urgent > 0) {
    summaryBody += `⚠️ Please review ${urgent} urgent item(s)`;
  } else {
    summaryBody += `✅ No critical items, but ${upcoming} items expiring soon`;
  }

  const notification = {
    title: critical > 0 ? '🚨 Critical Expiry Alert!' : '📊 Daily Expiry Summary',
    body: summaryBody,
  };

  const data = {
    type: 'DAILY_EXPIRY_SUMMARY',
    criticalCount: critical.toString(),
    urgentCount: urgent.toString(),
    upcomingCount: upcoming.toString(),
    totalCount: total.toString(),
    link: '/dashboard/inventory-management',
    urgency: critical > 0 ? 'high' : 'normal',
    vibrate: [200, 100, 200],
    requireInteraction: critical > 0,
    color: critical > 0 ? '#D32F2F' : urgent > 0 ? '#F57C00' : '#FFA726',
    backgroundColor: critical > 0 ? '#FFCDD2' : urgent > 0 ? '#FFE0B2' : '#FFF3E0',
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
  sendExpiringProductAlert,
  sendDailyExpirySummary,
};
