const { prisma } = require('../../config/database');

/**
 * Save/Update FCM token for user
 * POST /api/auth/fcm-token
 */
const saveFCMToken = async (req, res) => {
  try {
    const { userId, fcmToken, userType } = req.body;

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

    // Update FCM token based on user type
    if (userType === 'user') {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { fcmToken },
        select: { id: true, name: true, email: true, fcmToken: true },
      });

      console.log(`✅ FCM token saved for user: ${user.name} (${user.email})`);

      return res.json({
        success: true,
        message: 'FCM token saved successfully',
        data: { userId: user.id, userType: 'user' },
      });
    } else {
      const admin = await prisma.admin.update({
        where: { id: userId },
        data: { fcmToken },
        select: { id: true, name: true, email: true, fcmToken: true },
      });

      console.log(`✅ FCM token saved for admin: ${admin.name} (${admin.email})`);

      return res.json({
        success: true,
        message: 'FCM token saved successfully',
        data: { userId: admin.id, userType: 'admin' },
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
 * Remove FCM token (on logout)
 * DELETE /api/auth/fcm-token
 */
const removeFCMToken = async (req, res) => {
  try {
    const { userId, userType } = req.body;

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

    // Remove FCM token based on user type
    if (userType === 'user') {
      await prisma.user.update({
        where: { id: userId },
        data: { fcmToken: null },
      });

      console.log(`✅ FCM token removed for user: ${userId}`);
    } else {
      await prisma.admin.update({
        where: { id: userId },
        data: { fcmToken: null },
      });

      console.log(`✅ FCM token removed for admin: ${userId}`);
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
