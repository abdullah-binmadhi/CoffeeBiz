# CoffeeBiz Analytics API Server

This is the REST API server for the CoffeeBiz Analytics dashboard, built with Express.js and TypeScript.

## Features

- **Revenue Analytics**: Track revenue metrics, trends, and comparisons
- **Product Performance**: Analyze product sales, categories, and seasonal trends
- **Traffic Analysis**: Monitor hourly/daily patterns and capacity utilization
- **Customer Analytics**: Customer insights, retention, loyalty, and segmentation
- **Inventory Management**: Demand forecasting, stock optimization, and waste analysis

## API Endpoints

### Revenue Analytics
- `GET /api/revenue/metrics` - Get revenue metrics with date range
- `GET /api/revenue/trends` - Get revenue trends by period
- `GET /api/revenue/comparison` - Compare revenue across different periods

### Product Performance
- `GET /api/products/performance` - Get product performance data
- `GET /api/products/trends` - Get product performance trends over time
- `GET /api/products/categories` - Get all product categories with stats
- `GET /api/products/seasonal` - Get seasonal product performance

### Traffic Analysis
- `GET /api/traffic/hourly` - Get hourly traffic patterns
- `GET /api/traffic/daily` - Get daily traffic patterns
- `GET /api/traffic/patterns` - Get comprehensive traffic patterns
- `GET /api/traffic/capacity` - Get capacity utilization metrics

### Customer Analytics
- `GET /api/customers/insights` - Get comprehensive customer insights
- `GET /api/customers/retention` - Get customer retention analysis
- `GET /api/customers/loyalty` - Get loyalty program effectiveness
- `GET /api/customers/segments` - Get customer segmentation analysis

### Inventory Management
- `GET /api/inventory/demand-forecast` - Get demand forecasting for products
- `GET /api/inventory/stock-optimization` - Get stock level optimization recommendations
- `GET /api/inventory/waste-analysis` - Get waste reduction insights
- `GET /api/inventory/supplier-performance` - Get supplier performance metrics

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. Set up the database:
   ```bash
   npm run db:setup
   ```

4. Start the development server:
   ```bash
   npm run server
   ```

5. Or run both frontend and backend:
   ```bash
   npm run dev
   ```

## Testing

Run API tests:
```bash
npm run test:api
```

Run structure tests (without database):
```bash
npx vitest run server/__tests__/api-structure.test.ts --config vitest.config.ts
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: API rate limiting
- **Input Validation**: Parameter validation and sanitization
- **Error Handling**: Comprehensive error handling with proper HTTP status codes

## Database

The API connects to a PostgreSQL database with the following configuration:
- Host: `DB_HOST` (default: localhost)
- Port: `DB_PORT` (default: 5432)
- Database: `DB_NAME` (default: coffeebiz_analytics)
- User: `DB_USER` (default: postgres)
- Password: `DB_PASSWORD` (default: password)

## Architecture

- **Express.js**: Web framework
- **TypeScript**: Type safety
- **PostgreSQL**: Database
- **Connection Pooling**: Efficient database connections
- **Modular Routes**: Organized by feature area
- **Error Middleware**: Centralized error handling
- **Validation**: Input validation and sanitization