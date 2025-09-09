# CoffeeBiz Analytics API Documentation

This document provides comprehensive documentation for the CoffeeBiz Analytics REST API.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently, the API does not require authentication. Future versions will implement JWT-based authentication.

## Response Format

All API responses follow a consistent JSON format:

```json
{
  "data": {},
  "status": "success",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error responses:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  },
  "status": "error",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Rate Limiting

- **Rate Limit**: 100 requests per minute per IP
- **Headers**: Rate limit information is included in response headers

## Caching

- **Cache Duration**: 5 minutes for most endpoints
- **Cache Headers**: Appropriate cache headers are set for client-side caching

---

## Revenue Analytics Endpoints

### GET /api/revenue/metrics

Get comprehensive revenue metrics for a specified date range.

**Query Parameters:**
- `startDate` (optional): Start date in YYYY-MM-DD format (default: 30 days ago)
- `endDate` (optional): End date in YYYY-MM-DD format (default: today)
- `period` (optional): Aggregation period - 'daily', 'weekly', 'monthly' (default: 'daily')

**Example Request:**
```bash
GET /api/revenue/metrics?startDate=2024-01-01&endDate=2024-01-31&period=daily
```

**Response:**
```json
{
  "totalRevenue": 15420.50,
  "transactionCount": 1250,
  "averageTransactionValue": 12.34,
  "uniqueCustomers": 890,
  "growthRate": 15.5,
  "dailyRevenue": [
    {
      "date": "2024-01-01",
      "revenue": 520.30,
      "transactions": 42,
      "uniqueCustomers": 38
    }
  ],
  "paymentMethodBreakdown": {
    "card": {
      "count": 750,
      "revenue": 9250.30
    },
    "cash": {
      "count": 500,
      "revenue": 6170.20
    }
  },
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

### GET /api/revenue/trends

Get revenue trends over time with specified aggregation period.

**Query Parameters:**
- `period` (optional): 'hourly', 'daily', 'weekly', 'monthly' (default: 'daily')
- `limit` (optional): Number of periods to return (default: 30)

**Example Request:**
```bash
GET /api/revenue/trends?period=weekly&limit=12
```

**Response:**
```json
{
  "trends": [
    {
      "period": "2024-01-22",
      "revenue": 3420.50,
      "transactions": 280,
      "averageTransactionValue": 12.22,
      "uniqueCustomers": 210
    }
  ],
  "periodType": "weekly"
}
```

### GET /api/revenue/comparison

Compare revenue metrics between two time periods.

**Query Parameters:**
- `currentStart` (required): Current period start date (YYYY-MM-DD)
- `currentEnd` (required): Current period end date (YYYY-MM-DD)
- `compareStart` (required): Comparison period start date (YYYY-MM-DD)
- `compareEnd` (required): Comparison period end date (YYYY-MM-DD)

**Example Request:**
```bash
GET /api/revenue/comparison?currentStart=2024-02-01&currentEnd=2024-02-29&compareStart=2024-01-01&compareEnd=2024-01-31
```

**Response:**
```json
{
  "current": {
    "revenue": 18500.75,
    "transactions": 1450,
    "averageTransactionValue": 12.76,
    "uniqueCustomers": 980
  },
  "comparison": {
    "revenue": 15420.50,
    "transactions": 1250,
    "averageTransactionValue": 12.34,
    "uniqueCustomers": 890
  },
  "changes": {
    "revenue": 19.97,
    "transactions": 16.00,
    "averageTransactionValue": 3.40,
    "uniqueCustomers": 10.11
  }
}
```

---

## Product Performance Endpoints

### GET /api/products/performance

Get comprehensive product performance analytics.

**Query Parameters:**
- `startDate` (optional): Start date for analysis (default: 30 days ago)
- `endDate` (optional): End date for analysis (default: today)
- `category` (optional): Filter by product category
- `limit` (optional): Number of products to return (default: 50)

**Response:**
```json
{
  "topProducts": [
    {
      "id": "uuid",
      "name": "Cappuccino Large",
      "category": "cappuccino",
      "totalRevenue": 2450.30,
      "totalQuantity": 180,
      "averagePrice": 13.61,
      "profitMargin": 65.5
    }
  ],
  "bottomProducts": [...],
  "categoryPerformance": [
    {
      "category": "latte",
      "revenue": 5420.80,
      "quantity": 420,
      "averagePrice": 12.90,
      "profitMargin": 62.3
    }
  ]
}
```

### GET /api/products/trends

Get product performance trends over time.

**Query Parameters:**
- `productId` (optional): Specific product ID to analyze
- `category` (optional): Product category to analyze
- `period` (optional): 'daily', 'weekly', 'monthly' (default: 'daily')
- `limit` (optional): Number of periods (default: 30)

### GET /api/products/categories

Get all product categories with performance statistics.

**Response:**
```json
{
  "categories": [
    {
      "name": "latte",
      "productCount": 8,
      "totalRevenue": 12450.30,
      "averagePrice": 13.25,
      "profitMargin": 64.2
    }
  ]
}
```

### GET /api/products/seasonal

Get seasonal product performance analysis.

**Query Parameters:**
- `year` (optional): Year to analyze (default: current year)
- `category` (optional): Filter by category

---

## Traffic Analysis Endpoints

### GET /api/traffic/hourly

Get hourly traffic patterns and sales volume.

**Query Parameters:**
- `date` (optional): Specific date to analyze (YYYY-MM-DD, default: today)
- `dayOfWeek` (optional): Day of week (0-6, Sunday=0)

**Response:**
```json
{
  "hourlyData": [
    {
      "hour": 8,
      "transactions": 45,
      "revenue": 580.50,
      "uniqueCustomers": 42,
      "averageWaitTime": 3.2
    }
  ],
  "peakHours": [8, 12, 17],
  "totalTransactions": 320,
  "totalRevenue": 4250.80
}
```

### GET /api/traffic/daily

Get daily traffic patterns and comparisons.

**Query Parameters:**
- `startDate` (optional): Start date (default: 7 days ago)
- `endDate` (optional): End date (default: today)

### GET /api/traffic/patterns

Get comprehensive traffic pattern analysis.

**Response:**
```json
{
  "weeklyPatterns": {
    "monday": { "avgTransactions": 180, "avgRevenue": 2340.50 },
    "tuesday": { "avgTransactions": 165, "avgRevenue": 2150.30 }
  },
  "hourlyPatterns": [...],
  "seasonalPatterns": [...],
  "recommendations": {
    "staffing": [
      {
        "timeSlot": "8:00-10:00",
        "recommendedStaff": 3,
        "reason": "Morning rush peak"
      }
    ]
  }
}
```

### GET /api/traffic/capacity

Get capacity utilization metrics and recommendations.

---

## Customer Analytics Endpoints

### GET /api/customers/insights

Get comprehensive customer behavior insights.

**Query Parameters:**
- `startDate` (optional): Analysis start date
- `endDate` (optional): Analysis end date
- `segment` (optional): Customer segment to analyze

**Response:**
```json
{
  "totalCustomers": 1250,
  "newCustomers": 180,
  "returningCustomers": 1070,
  "retentionRate": 85.6,
  "averageLifetimeValue": 245.80,
  "averageVisitFrequency": 2.3,
  "segments": [
    {
      "name": "High Value",
      "customerCount": 125,
      "averageSpend": 450.30,
      "visitFrequency": 4.2
    }
  ]
}
```

### GET /api/customers/retention

Get customer retention analysis.

**Response:**
```json
{
  "retentionRates": {
    "1month": 78.5,
    "3months": 65.2,
    "6months": 52.8,
    "12months": 41.3
  },
  "cohortAnalysis": [...],
  "churnPrediction": [...]
}
```

### GET /api/customers/loyalty

Get loyalty program effectiveness metrics.

### GET /api/customers/segments

Get customer segmentation analysis based on spending patterns.

---

## Inventory Management Endpoints

### GET /api/inventory/demand-forecast

Get demand forecasting for products.

**Query Parameters:**
- `productId` (optional): Specific product to forecast
- `category` (optional): Product category
- `days` (optional): Forecast period in days (default: 30)

**Response:**
```json
{
  "forecasts": [
    {
      "productId": "uuid",
      "productName": "Cappuccino Large",
      "currentStock": 50,
      "forecastedDemand": 180,
      "recommendedOrder": 130,
      "confidence": 85.5
    }
  ],
  "forecastPeriod": {
    "start": "2024-02-01",
    "end": "2024-03-01"
  }
}
```

### GET /api/inventory/stock-optimization

Get stock level optimization recommendations.

**Response:**
```json
{
  "recommendations": [
    {
      "productId": "uuid",
      "productName": "Espresso Beans",
      "currentStock": 25,
      "optimalStock": 45,
      "reorderPoint": 15,
      "economicOrderQuantity": 30,
      "priority": "high"
    }
  ]
}
```

### GET /api/inventory/waste-analysis

Get waste reduction insights and recommendations.

### GET /api/inventory/supplier-performance

Get supplier performance metrics and analysis.

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_DATE_RANGE` | Start date is after end date |
| `MISSING_DATES` | Required date parameters are missing |
| `INVALID_PERIOD` | Invalid period parameter |
| `PRODUCT_NOT_FOUND` | Requested product does not exist |
| `INSUFFICIENT_DATA` | Not enough data for analysis |
| `CALCULATION_ERROR` | Error in metric calculations |
| `EXPORT_FAILED` | Report export failed |

## HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Data Models

### Transaction
```typescript
interface Transaction {
  id: string;
  transactionDate: string;
  transactionDatetime: string;
  customerId?: string;
  productId: string;
  paymentMethod: 'cash' | 'card';
  amount: number;
  quantity: number;
  unitPrice: number;
}
```

### Product
```typescript
interface Product {
  id: string;
  name: string;
  category: 'espresso' | 'latte' | 'americano' | 'hot_chocolate' | 'tea' | 'specialty' | 'other';
  basePrice: number;
  isActive: boolean;
}
```

### Customer
```typescript
interface Customer {
  id: string;
  cardNumber?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  totalVisits: number;
  totalSpent: number;
  preferredPaymentMethod?: 'cash' | 'card';
}
```

## SDK and Client Libraries

Currently, no official SDK is available. Use standard HTTP clients like:

- **JavaScript**: fetch, axios
- **Python**: requests, httpx
- **cURL**: Command line testing

## Postman Collection

A Postman collection with all endpoints and example requests is available at:
`/docs/CoffeeBiz_Analytics_API.postman_collection.json`

## Changelog

### v1.0.0
- Initial API release
- All core analytics endpoints
- Caching implementation
- Rate limiting
- Error handling

---

For additional support or questions, please refer to the main [README.md](./README.md) or create an issue in the GitHub repository.