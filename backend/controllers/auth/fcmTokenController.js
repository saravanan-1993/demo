const { prisma } = require('../../config/database');

/**
 * Save/Update FCM token for user (Multi-device support)
 * POST /api/auth/fcm-token
 */
const saveFCMToken = async (req, res) => {
  try {
    const { userId, fcmToken, userType, deviceInfo } = req.body;

    if (!userId || !fcmToken || !userType) {
      return res.status(400).json({
        success: false,
        error: 'userId, fcmToken, and userType are required',
      });
    }

    if (!['user', 'admin'].includes(userType)) {
      return res.status(400).json({
        success: false,
        error: 'userType must be either "user" or "admin"',
      });
    }

    // Get device info (browser, OS, etc.)
    const device = deviceInfo || req.headers['user-agent'] || 'Unknown Device';
    const now = new Date();

    // Update FCM token based on user type
    if (userType === 'user') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, fcmTokens: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Get existing tokens array
      let tokens = Array.isArray(user.fcmTokens) ? user.fcmTokens : [];

      // ✅ FIX: Only remove the EXACT same token (not by device name)
      // This allows multiple systems with same browser/OS combination
      // Each system generates a unique FCM token even if device name is same
      tokens = tokens.filter(t => t.token !== fcmToken);

      // Add new token to the beginning
      tokens.unshift({
        token: fcmToken,
        device: device,
        lastUsed: now.toISOString(),
      });

      // Keep only last 10 devices (prevent unlimited growth)
      if (tokens.length > 10) {
        tokens = tokens.slice(0, 10);
      }

      // Update user with new tokens array
      await prisma.user.update({
        where: { id: userId },
        data: { fcmTokens: tokens },
      });

      console.log(`✅ FCM token saved for user: ${user.name} (${user.email}) - Total devices: ${tokens.length}`);

      return res.json({
        success: true,
        message: 'FCM token saved successfully',
        data: { 
          userId: user.id, 
          userType: 'user',
          totalDevices: tokens.length 
        },
      });
    } else {
      const admin = await prisma.admin.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, fcmTokens: true },
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found',
        });
      }

      // Get existing tokens array
      let tokens = Array.isArray(admin.fcmTokens) ? admin.fcmTokens : [];

      // ✅ FIX: Only remove the EXACT same token (not by device name)
      // This allows multiple systems with same browser/OS combination
      // Each system generates a unique FCM token even if device name is same
      tokens = tokens.filter(t => t.token !== fcmToken);

      // Add new token to the beginning
      tokens.unshift({
        token: fcmToken,
        device: device,
        lastUsed: now.toISOString(),
      });

      // Keep only last 10 devices
      if (tokens.length > 10) {
        tokens = tokens.slice(0, 10);
      }

      // Update admin with new tokens array
      await prisma.admin.update({
        where: { id: userId },
        data: { fcmTokens: tokens },
      });

      console.log(`✅ FCM token saved for admin: ${admin.name} (${admin.email}) - Total devices: ${tokens.length}`);

      return res.json({
        success: true,
        message: 'FCM token saved successfully',
        data: { 
          userId: admin.id, 
          userType: 'admin',
          totalDevices: tokens.length 
        },
      });
    }
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save FCM token',
      message: error.message,
    });
  }
};

/**
 * Remove FCM token (on logout from specific device)
 * DELETE /api/auth/fcm-token
 */
const removeFCMToken = async (req, res) => {
  try {
    const { userId, userType, fcmToken } = req.body;

    if (!userId || !userType) {
      return res.status(400).json({
        success: false,
        error: 'userId and userType are required',
      });
    }

    if (!['user', 'admin'].includes(userType)) {
      return res.status(400).json({
        success: false,
        error: 'userType must be either "user" or "admin"',
      });
    }

    // Remove specific FCM token or all tokens
    if (userType === 'user') {
      if (fcmToken) {
        // Remove specific token (logout from one device)
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { fcmTokens: true },
        });

        if (user) {
          const tokens = Array.isArray(user.fcmTokens) ? user.fcmTokens : [];
          const updatedTokens = tokens.filter(t => t.token !== fcmToken);

          await prisma.user.update({
            where: { id: userId },
            data: { fcmTokens: updatedTokens },
          });

          console.log(`✅ FCM token removed for user: ${userId} - Remaining devices: ${updatedTokens.length}`);
        }
      } else {
        // Remove all tokens (logout from all devices)
        await prisma.user.update({
          where: { id: userId },
          data: { fcmTokens: [] },
        });

        console.log(`✅ All FCM tokens removed for user: ${userId}`);
      }
    } else {
      if (fcmToken) {
        // Remove specific token
        const admin = await prisma.admin.findUnique({
          where: { id: userId },
          select: { fcmTokens: true },
        });

        if (admin) {
          const tokens = Array.isArray(admin.fcmTokens) ? admin.fcmTokens : [];
          const updatedTokens = tokens.filter(t => t.token !== fcmToken);

          await prisma.admin.update({
            where: { id: userId },
            data: { fcmTokens: updatedTokens },
          });

          console.log(`✅ FCM token removed for admin: ${userId} - Remaining devices: ${updatedTokens.length}`);
        }
      } else {
        // Remove all tokens
        await prisma.admin.update({
          where: { id: userId },
          data: { fcmTokens: [] },
        });

        console.log(`✅ All FCM tokens removed for admin: ${userId}`);
      }
    }

    res.json({
      success: true,
      message: 'FCM token removed successfully',
    });
  } catch (error) {
    console.error('❌ Error removing FCM token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove FCM token',
      message: error.message,
    });
  }
};

module.exports = {
  saveFCMToken,
  removeFCMToken,
};
