import axiosInstance from '@/lib/axios';
import type { DashboardData } from '@/types/dashboard';

/**
 * Dashboard API Service
 * Uses unified backend API endpoint for all dashboard data
 */
export const dashboardService = {
  /**
   * Get comprehensive dashboard data from unified API
   * @param startDate - Optional start date (YYYY-MM-DD)
   * @param endDate - Optional end date (YYYY-MM-DD)
   * @returns Complete dashboard data
   */
  async getDashboardData(startDate?: string, endDate?: string): Promise<DashboardData> {
    try {
      const params: Record<string, string> = {};
      
      if (startDate) {
        params.startDate = startDate;
      }
      
      if (endDate) {
        params.endDate = endDate;
      }

      const response = await axiosInstance.get('/api/dashboard', { params });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch dashboard data');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }
};

