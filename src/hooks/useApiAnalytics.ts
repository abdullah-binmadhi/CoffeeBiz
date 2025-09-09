import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/apiService';
import { 
  RevenueMetrics, 
  ProductPerformance, 
  TrafficAnalysis, 
  CustomerInsights 
} from '../types';
import { useToast } from './useToast';

export const useApiAnalytics = () => {
  const [apiService] = useState(() => new ApiService());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance | null>(null);
  const [trafficAnalysis, setTrafficAnalysis] = useState<TrafficAnalysis | null>(null);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsights | null>(null);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const { showSuccess, showError, toasts, removeToast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if API is available
      await apiService.healthCheck();

      // Load all data in parallel
      const [revenue, products, traffic, customers, inventory] = await Promise.all([
        apiService.getRevenueMetrics(),
        apiService.getProductPerformance(),
        apiService.getTrafficAnalysis(),
        apiService.getCustomerInsights(),
        apiService.getInventoryForecast()
      ]);

      setRevenueMetrics(revenue);
      setProductPerformance(products);
      setTrafficAnalysis(traffic);
      setCustomerInsights(customers);
      setInventoryData(inventory);

      showSuccess('Data loaded successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      showError(`Failed to load analytics data: ${errorMessage}`);
      console.error('API Analytics loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiService, showSuccess, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  const exportData = useCallback((moduleType: string) => {
    // Mock export functionality
    showSuccess(`${moduleType} data exported successfully!`);
  }, [showSuccess]);

  return {
    // Data
    revenueMetrics,
    productPerformance,
    trafficAnalysis,
    customerInsights,
    inventoryData,
    
    // State
    isLoading,
    error,
    
    // Actions
    refreshData,
    exportData,
    
    // Toast system
    toasts,
    removeToast
  };
};