import { Request, Response, NextFunction } from 'express';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  static getAverageMetric(name: string): number {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  static getMetricPercentile(name: string, percentile: number): number {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  static getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [name, values] of this.metrics) {
      result[name] = {
        count: values.length,
        average: this.getAverageMetric(name),
        min: Math.min(...values),
        max: Math.max(...values),
        p50: this.getMetricPercentile(name, 50),
        p95: this.getMetricPercentile(name, 95),
        p99: this.getMetricPercentile(name, 99)
      };
    }
    
    return result;
  }

  static clearMetrics(): void {
    this.metrics.clear();
  }
}

// Middleware to track response times
export function performanceTrackingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      
      PerformanceMonitor.recordMetric(`response_time_${endpoint}`, responseTime);
      PerformanceMonitor.recordMetric('response_time_all', responseTime);
      
      // Log slow requests
      if (responseTime > 3000) {
        console.warn(`Slow request detected: ${endpoint} took ${responseTime}ms`);
      }
    });
    
    next();
  };
}