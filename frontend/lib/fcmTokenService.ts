import axiosInstance from './axios';

/**
 * Save FCM token to backend
 */
export const saveFCMToken = async (
  userId: string,
  fcmToken: string,
  userType: 'user' | 'admin'
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await axiosInstance.post('/api/auth/fcm-token', {
      userId,
      fcmToken,
      userType,
    });

    if (response.data.success) {
      console.log('✅ FCM token saved to backend');
      return { success: true };
    } else {
      console.error('❌ Failed to save FCM token:', response.data.error);
      return { success: false, message: response.data.error };
    }
  } catch (error: any) {
    console.error('❌ Error saving FCM token:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Remove FCM token from backend (on logout)
 */
export const removeFCMToken = async (
  userId: string,
  userType: 'user' | 'admin'
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await axiosInstance.delete('/api/auth/fcm-token', {
      data: { userId, userType },
    });

    if (response.data.success) {
      console.log('✅ FCM token removed from backend');
      return { success: true };
    } else {
      console.error('❌ Failed to remove FCM token:', response.data.error);
      return { success: false, message: response.data.error };
    }
  } catch (error: any) {
    console.error('❌ Error removing FCM token:', error.message);
    return { success: false, message: error.message };
  }
};
