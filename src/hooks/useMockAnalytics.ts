import { useState, useEffect } from 'react';
import { 
  mockRevenueMetrics, 
  mockProductPerformance, 
  mockTrafficAnalysis, 
  mockCustomerInsights 
} from '../data/mockData';
import { 
  RevenueMetrics, 
  ProductPerformance, 
  TrafficAnalysis, 
  CustomerInsights 
} from '../types';

export const useMockAnalytics = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance | null>(null);
  const [trafficAnalysis, setTrafficAnalysis] = useState<TrafficAnalysis | null>(null);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsights | null>(null);
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    // Simulate loading delay
    const loadData = async () => {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        setRevenueMetrics(mockRevenueMetrics);
        setProductPerformance(mockProductPerformance);
        setTrafficAnalysis(mockTrafficAnalysis);
        setCustomerInsights(mockCustomerInsights);
        setError(null);
        
        // Show success toast
        showSuccess('Analytics data loaded successfully!');
      } catch (err) {
        setError('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const showSuccess = (message: string) => {
    const toast = {
      id: Date.now(),
      message,
      type: 'success' as const
    };
    setToasts(prev => [...prev, toast]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      removeToast(toast.id);
    }, 3000);
  };

  const showError = (message: string) => {
    const toast = {
      id: Date.now(),
      message,
      type: 'error' as const
    };
    setToasts(prev => [...prev, toast]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeToast(toast.id);
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showSuccess('Data refreshed successfully!');
    }, 500);
  };

  const exportData = (moduleType: string) => {
    showSuccess(`${moduleType} data exported successfully!`);
  };

  return {
    // Data
    revenueMetrics,
    productPerformance,
    trafficAnalysis,
    customerInsights,
    inventoryData: productPerformance, // Use product data for inventory
    
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