# CoffeeBiz Analytics

A comprehensive business intelligence dashboard specifically designed for coffee shop owners and managers to optimize operations and maximize profitability. Transform raw sales data into actionable business insights.

**🌐 Live Demo**: [https://abdullah-binmadhi.github.io/CoffeeBiz](https://abdullah-binmadhi.github.io/CoffeeBiz)

![CoffeeBiz Analytics Dashboard](https://img.shields.io/badge/Status-Production%20Ready-green)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-16%2B-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12%2B-blue)

## 🚀 Features

### 📊 Revenue Analytics
- Real-time revenue tracking with daily, weekly, monthly, and yearly views
- Revenue trend analysis with growth rate calculations
- Profit margin analysis by product category
- Average transaction value tracking
- Comparative analysis between time periods

### 🛍️ Product Performance Analysis
- Best and worst-selling product identification
- Profit margin analysis by individual products
- Product category performance tracking
- Size preference analysis (small, medium, large)
- Add-on performance tracking (extra shots, syrups, milk alternatives)
- Seasonal product performance trends

### ⏰ Peak Hours & Traffic Analysis
- Hour-by-hour sales volume visualization
- Daily pattern identification (morning rush, afternoon slump)
- Day-of-week performance comparison
- Staff optimization recommendations
- Queue time analysis during peak hours
- Capacity utilization metrics

### 👥 Customer Behavior Insights
- Customer retention rate analysis
- Customer lifetime value calculations
- Repeat purchase pattern identification
- New vs returning customer metrics
- Purchase frequency analysis
- Customer segmentation based on spending patterns

### 📦 Inventory Management
- Demand forecasting for key products
- Stock level optimization recommendations
- Waste reduction insights
- Reorder point recommendations
- Supplier performance tracking
- Cost and markup optimization analysis

### 📱 User Experience
- Mobile-responsive design for on-the-go access
- Intuitive interface requiring minimal training
- Export functionality (PDF, Excel)
- Real-time data updates
- Alert system for unusual patterns

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Chart.js
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Redis caching
- **Testing**: Jest, React Testing Library, Playwright, Vitest
- **Development**: Concurrently, Nodemon, ts-node

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 16 or higher
- **PostgreSQL** 12 or higher
- **Redis** (optional, for caching)
- **npm** or **yarn** package manager

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/coffeebiz-analytics.git
cd coffeebiz-analytics
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# Required variables:
# - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# - REDIS_HOST, REDIS_PORT (if using Redis)
```

### 4. Database Setup

```bash
# Create PostgreSQL database
createdb coffeebiz_analytics

# Run database setup (creates tables, indexes, and loads sample data)
npm run db:setup
```

### 5. Start the Application

```bash
# Start both frontend and backend in development mode
npm run dev

# Or start them separately:
npm run server  # Backend only (port 3001)
npm start       # Frontend only (port 3000)
```

### 6. Access the Dashboard

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001/api

## 📖 Documentation

### API Documentation
See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API endpoint documentation.

### Database Schema
See [database/README.md](./database/README.md) for database schema and setup details.

### User Guide
See [USER_GUIDE.md](./USER_GUIDE.md) for dashboard usage instructions.

### Deployment Guide
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for production deployment instructions.

## 🧪 Testing

### Run All Tests
```bash
npm run test:all
```

### Individual Test Suites
```bash
# API tests
npm run test:api

# Frontend tests
npm run test:frontend

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## 📊 Sample Data

The application includes sample coffee shop data for demonstration:

- **Transactions**: 10,000+ sample transactions
- **Products**: Coffee varieties, pastries, and add-ons
- **Customers**: Mix of cash and card customers
- **Time Range**: 12 months of historical data

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start React development server |
| `npm run server` | Start Express API server |
| `npm run dev` | Start both frontend and backend |
| `npm run build` | Build production React app |
| `npm run test:all` | Run all test suites |
| `npm run db:setup` | Initialize database with schema and data |
| `npm run db:reset` | Reset database (development only) |
| `npm run db:migrate` | Run database migrations |

## 🏗️ Project Structure

```
coffeebiz-analytics/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API service layer
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── server/                # Express.js backend
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   └── __tests__/         # Backend tests
├── database/              # Database schema and migrations
│   ├── migrations/        # SQL migration files
│   └── setup.ts          # Database setup script
├── e2e/                   # End-to-end tests
└── public/                # Static assets
```

## 🚀 Performance

- **Dashboard Load Time**: < 3 seconds
- **API Response Time**: < 500ms average
- **Mobile Performance**: Optimized for touch devices
- **Caching**: Redis caching for frequently accessed data
- **Database**: Optimized queries with proper indexing

## 🔒 Security Features

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting
- Security headers (Helmet.js)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [User Guide](./USER_GUIDE.md)
2. Review the [API Documentation](./API_DOCUMENTATION.md)
3. Search existing [GitHub Issues](https://github.com/your-username/coffeebiz-analytics/issues)
4. Create a new issue with detailed information

## 🎯 Roadmap

- [ ] Advanced forecasting algorithms
- [ ] Multi-location support
- [ ] Advanced user authentication
- [ ] Mobile app development
- [ ] Integration with POS systems
- [ ] Advanced reporting features

---

**Built with ❤️ for coffee shop owners who want to brew success with data**