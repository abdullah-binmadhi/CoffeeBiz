import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { performanceTrackingMiddleware } from './middleware/performance';
import { cacheHealthCheck } from './middleware/cache';
import { getCache } from './services/cache';
import { getJobService } from './services/jobs';
import { revenueRouter } from './routes/revenue';
import { productRouter } from './routes/products';
import { trafficRouter } from './routes/traffic';
import { customerRouter } from './routes/customers';
import { inventoryRouter } from './routes/inventory';
import { performanceRouter } from './routes/performance';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Performance tracking middleware
app.use(performanceTrackingMiddleware());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const cacheHealth = await cacheHealthCheck();
    const jobService = getJobService();
    const jobStats = await jobService.getQueueStats();
    
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        cache: cacheHealth,
        jobs: jobStats
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API routes
app.use('/api/revenue', revenueRouter);
app.use('/api/products', productRouter);
app.use('/api/traffic', trafficRouter);
app.use('/api/customers', customerRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/performance', performanceRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize services and start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 CoffeeBiz Analytics API ready`);
    
    try {
      // Initialize cache connection
      const cache = getCache();
      const cacheHealthy = await cache.healthCheck();
      console.log(`💾 Cache status: ${cacheHealthy ? 'Connected' : 'Disconnected'}`);
      
      // Initialize job service and schedule recurring jobs
      const jobService = getJobService();
      await jobService.scheduleRecurringJobs();
      console.log(`⚙️ Background jobs scheduled`);
      
    } catch (error) {
      console.error('❌ Service initialization error:', error);
    }
  });
}

export { app };