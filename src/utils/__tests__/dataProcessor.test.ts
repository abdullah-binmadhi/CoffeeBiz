import { DataProcessor } from '../dataProcessor';
import { ProductCategory } from '../../types';

describe('DataProcessor', () => {
  let processor: DataProcessor;
  
  beforeEach(() => {
    processor = new DataProcessor();
  });

  describe('CSV Processing', () => {
    const mockCSV = `date,datetime,cash_type,card,money,coffee_name
2024-03-01,2024-03-01 10:15:50.520,card,ANON-0000-0000-0001,38.7,Latte
2024-03-01,2024-03-01 12:19:22.539,card,ANON-0000-0000-0002,38.7,Hot Chocolate
2024-03-01,2024-03-01 13:46:33.006,card,ANON-0000-0000-0003,28.9,Americano`;

    it('should process CSV data correctly', async () => {
      const transactions = await processor.loadCSVData(mockCSV);
      
      expect(transactions).toHaveLength(3);
      expect(transactions[0].productName).toBe('Latte');
      expect(transactions[0].amount).toBe(38.7);
      expect(transactions[0].paymentMethod).toBe('card');
    });

    it('should categorize products correctly', async () => {
      const transactions = await processor.loadCSVData(mockCSV);
      
      expect(transactions[0].productCategory).toBe(ProductCategory.LATTE);
      expect(transactions[1].productCategory).toBe(ProductCategory.HOT_CHOCOLATE);
      expect(transactions[2].productCategory).toBe(ProductCategory.AMERICANO);
    });
  });

  describe('Revenue Calculations', () => {
    beforeEach(async () => {
      const mockCSV = `date,datetime,cash_type,card,money,coffee_name
2024-03-01,2024-03-01 10:15:50.520,card,ANON-0000-0000-0001,38.7,Latte
2024-03-01,2024-03-01 12:19:22.539,cash,,25.0,Americano
2024-03-02,2024-03-02 13:46:33.006,card,ANON-0000-0000-0003,30.0,Espresso`;
      
      await processor.loadCSVData(mockCSV);
    });

    it('should calculate total revenue correctly', () => {
      const metrics = processor.calculateRevenueMetrics();
      
      expect(metrics.totalRevenue).toBe(93.7);
      expect(metrics.transactionCount).toBe(3);
      expect(metrics.averageTransactionValue).toBeCloseTo(31.23, 2);
    });

    it('should calculate payment method breakdown', () => {
      const metrics = processor.calculateRevenueMetrics();
      
      expect(metrics.paymentMethodBreakdown.card.count).toBe(2);
      expect(metrics.paymentMethodBreakdown.card.revenue).toBe(68.7);
      expect(metrics.paymentMethodBreakdown.cash.count).toBe(1);
      expect(metrics.paymentMethodBreakdown.cash.revenue).toBe(25.0);
    });

    it('should group daily revenue correctly', () => {
      const metrics = processor.calculateRevenueMetrics();
      
      expect(metrics.dailyRevenue).toHaveLength(2);
      expect(metrics.dailyRevenue[0].date).toBe('2024-03-01');
      expect(metrics.dailyRevenue[0].revenue).toBe(63.7);
      expect(metrics.dailyRevenue[1].date).toBe('2024-03-02');
      expect(metrics.dailyRevenue[1].revenue).toBe(30.0);
    });
  });

  describe('Product Performance', () => {
    beforeEach(async () => {
      const mockCSV = `date,datetime,cash_type,card,money,coffee_name
2024-03-01,2024-03-01 10:15:50.520,card,ANON-0000-0000-0001,38.7,Latte
2024-03-01,2024-03-01 12:19:22.539,card,ANON-0000-0000-0002,35.0,Latte
2024-03-01,2024-03-01 13:46:33.006,cash,,25.0,Americano`;
      
      await processor.loadCSVData(mockCSV);
    });

    it('should calculate product performance correctly', () => {
      const performance = processor.calculateProductPerformance();
      
      expect(performance.topProducts).toHaveLength(2);
      expect(performance.topProducts[0].name).toBe('Latte');
      expect(performance.topProducts[0].totalSales).toBe(2);
      expect(performance.topProducts[0].totalRevenue).toBe(73.7);
      expect(performance.topProducts[0].averagePrice).toBeCloseTo(36.85, 2);
    });

    it('should calculate category performance', () => {
      const performance = processor.calculateProductPerformance();
      
      const latteCategory = performance.categoryPerformance.find(c => c.category === ProductCategory.LATTE);
      expect(latteCategory).toBeDefined();
      expect(latteCategory!.count).toBe(2);
      expect(latteCategory!.revenue).toBe(73.7);
    });
  });

  describe('Traffic Analysis', () => {
    beforeEach(async () => {
      const mockCSV = `date,datetime,cash_type,card,money,coffee_name
2024-03-01,2024-03-01 10:15:50.520,card,ANON-0000-0000-0001,38.7,Latte
2024-03-01,2024-03-01 10:30:22.539,card,ANON-0000-0000-0002,35.0,Latte
2024-03-01,2024-03-01 14:46:33.006,cash,,25.0,Americano`;
      
      await processor.loadCSVData(mockCSV);
    });

    it('should calculate hourly traffic correctly', () => {
      const traffic = processor.calculateTrafficAnalysis();
      
      expect(traffic.hourlyStats.length).toBeGreaterThan(0);
      
      const hour10 = traffic.hourlyStats.find(h => h.hour === 10);
      expect(hour10).toBeDefined();
      expect(hour10!.transactions).toBe(2);
      expect(hour10!.revenue).toBe(73.7);
    });

    it('should identify peak hours', () => {
      const traffic = processor.calculateTrafficAnalysis();
      
      expect(traffic.peakHours).toContain(10);
      expect(traffic.peakHours.length).toBeLessThanOrEqual(3);
    });
  });
});