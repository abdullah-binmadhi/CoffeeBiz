-- Migration: 001_initial_schema
-- Description: Create initial database schema for CoffeeBiz Analytics
-- Created: 2024-01-01

BEGIN;

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE payment_method AS ENUM ('cash', 'card');
CREATE TYPE product_category AS ENUM (
    'espresso',
    'latte', 
    'americano',
    'hot_chocolate',
    'tea',
    'specialty',
    'other'
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_number VARCHAR(255) UNIQUE,
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_visits INTEGER DEFAULT 1,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    preferred_payment_method payment_method,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category product_category NOT NULL,
    base_price DECIMAL(8,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_card_payment CHECK (
        (payment_method = 'card' AND card_number IS NOT NULL) OR
        (payment_method = 'cash' AND card_number IS NULL)
    )
);

-- Summary tables
CREATE TABLE daily_revenue_summary (
    summary_date DATE PRIMARY KEY,
    total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    cash_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    card_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    cash_transactions INTEGER NOT NULL DEFAULT 0,
    card_transactions INTEGER NOT NULL DEFAULT 0,
    average_transaction_value DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE WHEN transaction_count > 0 THEN total_revenue / transaction_count ELSE 0 END
    ) STORED,
    unique_customers INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_performance_summary (
    product_id UUID REFERENCES products(id),
    summary_date DATE,
    total_sales INTEGER NOT NULL DEFAULT 0,
    total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    average_price DECIMAL(8,2) GENERATED ALWAYS AS (
        CASE WHEN total_sales > 0 THEN total_revenue / total_sales ELSE 0 END
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (product_id, summary_date)
);

CREATE TABLE hourly_traffic_summary (
    summary_date DATE,
    hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    transaction_count INTEGER NOT NULL DEFAULT 0,
    total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    unique_customers INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (summary_date, hour_of_day)
);

-- Create indexes
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_datetime ON transactions(transaction_datetime);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_product_id ON transactions(product_id);
CREATE INDEX idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX idx_transactions_card_number ON transactions(card_number) WHERE card_number IS NOT NULL;

CREATE INDEX idx_customers_card_number ON customers(card_number) WHERE card_number IS NOT NULL;
CREATE INDEX idx_customers_last_seen ON customers(last_seen_at);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_name ON products(name);

CREATE INDEX idx_daily_revenue_date ON daily_revenue_summary(summary_date);
CREATE INDEX idx_product_performance_date ON product_performance_summary(summary_date);
CREATE INDEX idx_hourly_traffic_date_hour ON hourly_traffic_summary(summary_date, hour_of_day);

-- Create update timestamp function and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_revenue_updated_at BEFORE UPDATE ON daily_revenue_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_performance_updated_at BEFORE UPDATE ON product_performance_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hourly_traffic_updated_at BEFORE UPDATE ON hourly_traffic_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;