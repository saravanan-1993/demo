const cron = require('node-cron');
const { checkAndSendStockAlerts, sendDailyStockSummary } = require('./stockAlertScheduler');

/**
 * Initialize all cron jobs for notifications
 */
const initializeCronJobs = () => {
  console.log('⏰ [Cron Jobs] Initializing scheduled tasks...');

  // Daily stock alert summary - runs every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ [Cron] Running daily stock summary (9:00 AM)...');
    try {
      await sendDailyStockSummary();
    } catch (error) {
      console.error('❌ [Cron] Error in daily stock summary:', error);
    }
  }, {
    timezone: 'Asia/Kolkata', // Indian Standard Time
  });

  // Daily stock alert summary - runs every day at 5:00 PM (evening reminder)
  cron.schedule('0 17 * * *', async () => {
    console.log('⏰ [Cron] Running evening stock summary (5:00 PM)...');
    try {
      await sendDailyStockSummary();
    } catch (error) {
      console.error('❌ [Cron] Error in evening stock summary:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  // Critical alerts every 6 hours for out-of-stock items
  cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ [Cron] Running 6-hourly critical stock check...');
    try {
      await checkAndSendStockAlerts();
    } catch (error) {
      console.error('❌ [Cron] Error in 6-hourly stock check:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('✅ [Cron Jobs] Scheduled tasks initialized:');
  console.log('   - Daily Summary: 9:00 AM & 5:00 PM IST');
  console.log('   - Critical Alerts: Every 6 hours');
  console.log('   - Timezone: Asia/Kolkata (IST)');
};

module.exports = {
  initializeCronJobs,
};
