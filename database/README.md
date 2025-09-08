# CoffeeBiz Analytics Database

This directory contains the database schema, migrations, and setup scripts for the CoffeeBiz Analytics application.

## Database Schema Overview

The database is designed to efficiently store and analyze coffee shop transaction data with the following main entities:

### Core Tables

1. **customers** - Customer information and loyalty tracking
2. **products** - Coffee shop product catalog
3. **transactions** - Individual transaction records (fact table)

### Summary Tables (for performance)

1. **daily_revenue_summary** - Pre-aggregated daily revenue metrics
2. **product_performance_summary** - Product sales performance by date
3. **hourly_traffic_summary** - Hourly traffic patterns

## Setup Instructions

### Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 16+ with TypeScript support
- Environment variables configured (see `.env.example`)

### Database Setup

1. **Create Database**
   ```bash
   createdb coffeebiz_analytics
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Run Setup Script**
   ```bash
   # Install dependencies first
   npm install

   # Setup database with migrations and seed data
   npm run db:setup

   # Or manually with ts-node
   ts-node database/setup.ts setup
   ```

### Available Scripts

- `npm run db:setup` - Initialize database with migrations and seed data
- `npm run db:reset` - Drop all tables and reinitialize (development only)
- `npm run db:migrate` - Run pending migrations only

## Database Schema Details

### Customers Table

Stores customer information with support for both cash and card customers:

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_number VARCHAR(255) UNIQUE, -- For card payments, null for cash
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_visits INTEGER DEFAULT 1,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    preferred_payment_method payment_method,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Products Table

Product catalog with categorization:

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category product_category NOT NULL,
    base_price DECIMAL(8,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Transactions Table

Main fact table for all transactions:

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    transaction_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    product_id UUID NOT NULL REFERENCES products(id),
    payment_method payment_method NOT NULL,
    card_number VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) GENERATED ALWAYS AS (amount / quantity) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Data Types

### Enums

- `payment_method`: 'cash' | 'card'
- `product_category`: 'espresso' | 'latte' | 'americano' | 'hot_chocolate' | 'tea' | 'specialty' | 'other'

## Indexes

The schema includes optimized indexes for common query patterns:

- Transaction date/datetime lookups
- Customer and product relationships
- Payment method filtering
- Card number lookups (partial index for non-null values)

## Data Validation

TypeScript validators are provided in `src/models/validators.ts` for:

- Customer data validation
- Product data validation  
- Transaction data validation
- Utility validation functions

## Migration System

The migration system supports:

- Sequential migration execution
- Migration tracking in `migrations` table
- Rollback capability (basic implementation)
- Transaction-wrapped migrations for safety

### Creating New Migrations

1. Create a new file in `database/migrations/` with format: `XXX_description.sql`
2. Use sequential numbering (001, 002, etc.)
3. Wrap DDL changes in BEGIN/COMMIT transactions
4. Test migrations on development data first

Example migration file:
```sql
-- Migration: 002_add_customer_preferences
-- Description: Add customer preference tracking
-- Created: 2024-01-02

BEGIN;

ALTER TABLE customers 
ADD COLUMN favorite_product_id UUID REFERENCES products(id),
ADD COLUMN preferred_time_of_day INTEGER CHECK (preferred_time_of_day >= 0 AND preferred_time_of_day <= 23);

CREATE INDEX idx_customers_favorite_product ON customers(favorite_product_id);

COMMIT;
```

## Performance Considerations

1. **Summary Tables**: Pre-aggregated data for common queries
2. **Indexes**: Optimized for typical analytics queries
3. **Partitioning**: Consider partitioning transactions table by date for large datasets
4. **Connection Pooling**: Configured with reasonable defaults

## Security

- UUID primary keys prevent enumeration attacks
- Input validation at application layer
- Prepared statements prevent SQL injection
- Environment-based configuration for credentials

## Monitoring

Monitor these metrics in production:

- Connection pool utilization
- Query performance (slow query log)
- Table sizes and growth rates
- Index usage statistics

## Backup Strategy

Recommended backup approach:

1. **Daily full backups** of the entire database
2. **Continuous WAL archiving** for point-in-time recovery
3. **Weekly backup testing** to ensure recoverability
4. **Summary table regeneration** procedures for disaster recovery