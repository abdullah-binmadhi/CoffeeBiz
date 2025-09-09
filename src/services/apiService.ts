import { 
  RevenueMetrics, 
  ProductPerformance, 
  TrafficAnalysis, 
  CustomerInsights 
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export class ApiService {
  private async fetchApi<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async getRevenueMetrics(startDate?: string, endDate?: string): Promise<RevenueMetrics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const endpoint = `/api/revenue/metrics${queryString ? `?${queryString}` : ''}`;
    
    return this.fetchApi<RevenueMetrics>(endpoint);
  }

  async getProductPerformance(): Promise<ProductPerformance> {
    return this.fetchApi<ProductPerformance>('/api/products/performance');
  }

  async getTrafficAnalysis(): Promise<TrafficAnalysis> {
    const hourlyData = await this.fetchApi<any>('/api/traffic/hourly');
    
    // Transform the API response to match our TrafficAnalysis interface
    return {
      hourlyStats: hourlyData.hourlyData.map((item: any) => ({
        hour: item.hour,
        revenue: item.revenue,
        transactions: item.transactions
      })),
      peakHours: hourlyData.peakHours,
      dailyPatterns: [] // Mock for now
    };
  }

  async getCustomerInsights(): Promise<CustomerInsights> {
    return this.fetchApi<CustomerInsights>('/api/customers/insights');
  }

  async getInventoryForecast(): Promise<any> {
    return this.fetchApi<any>('/api/inventory/demand-forecast');
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.fetchApi<{ status: string; timestamp: string }>('/health');
  }
}