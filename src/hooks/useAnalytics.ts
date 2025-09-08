import { useState, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { 
  RevenueMetrics, 
  ProductPerformance, 
  TrafficAnalysis, 
  CustomerInsights 
} from '../types';
import { useToast } from './useToast';

export const useAnalytics = () => {
  const [dataService] = useState(() => new DataService());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance | null>(null);
  const [trafficAnalysis, setTrafficAnalysis] = useState<TrafficAnalysis | null>(null);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsights | null>(null);
  const { showSuccess, showError, toasts, removeToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load datasets
      await dataService.loadDatasets();
      
      // Get data processor
      const processor = dataService.getDataProcessor();
      
      // Validate data
      const transactions = processor.getTransactions();
      const validation = dataService.validateData(transactions);
      
      if (!validation.isValid) {
        throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
      }

      // Calculate all metrics
      const [revenue, products, traffic, customers] = await Promise.all([
        Promise.resolve(processor.calculateRevenueMetrics()),
        Promise.resolve(processor.calculateProductPerformance()),
        Promise.resolve(processor.calculateTrafficAnalysis()),
        Promise.resolve(processor.calculateCustomerInsights())
      ]);

      setRevenueMetrics(revenue);
      setProductPerformance(products);
      setTrafficAnalysis(traffic);
      setCustomerInsights(customers);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Analytics loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    loadData();
  };

  const exportData = async (dataType: 'revenue' | 'products' | 'traffic' | 'customers') => {
    if (!dataService.isDataLoaded()) {
      setError('Please wait for data to load before exporting');
      return;
    }

    try {
      const processor = dataService.getDataProcessor();
      let data: any[] = [];
      let filename = '';

      switch (dataType) {
        case 'revenue':
          if (revenueMetrics) {
            data = revenueMetrics.dailyRevenue.map(d => ({
              date: d.date,
              revenue: d.revenue,
              transactions: d.transactions,
              averageTransactionValue: d.revenue / d.transactions
            }));
            filename = 'revenue_analysis.csv';
          }
          break;
        
        case 'products':
          if (productPerformance) {
            data = productPerformance.topProducts.map(p => ({
              productName: p.name,
              category: p.category,
              totalSales: p.totalSales,
              totalRevenue: p.totalRevenue,
              averagePrice: p.averagePrice
            }));
            filename = 'product_performance.csv';
          }
          break;
        
        case 'traffic':
          if (trafficAnalysis) {
            data = trafficAnalysis.hourlyStats.map(h => ({
              hour: h.hour,
              revenue: h.revenue,
              transactions: h.transactions,
              averagePerTransaction: h.revenue / h.transactions
            }));
            filename = 'traffic_analysis.csv';
          }
          break;
        
        case 'customers':
          data = processor.getTransactions().map(t => ({
            date: t.date.toISOString().split('T')[0],
            paymentMethod: t.paymentMethod,
            amount: t.amount,
            productName: t.productName,
            category: t.productCategory
          }));
          filename = 'customer_transactions.csv';
          break;
      }

      if (data.length === 0) {
        setError(`No ${dataType} data available for export`);
        return;
      }

      await dataService.exportToCSV(data, filename);
      
      // Show success notification
      showSuccess(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} data exported successfully!`);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      showError('Failed to export data. Please try again.');
      console.error('Export error:', err);
    }
  };

  return {
    isLoading,
    error,
    revenueMetrics,
    productPerformance,
    trafficAnalysis,
    customerInsights,
    refreshData,
    exportData,
    toasts,
    removeToast
  };
};