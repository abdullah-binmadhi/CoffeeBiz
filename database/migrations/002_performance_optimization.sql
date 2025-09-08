-- Performance Optimization Migration
-- Additional indexes and optimizations for CoffeeBiz Analytics

-- Create additional indexes for common query patterns

-- Composite indexes for revenue analytics
CREATE INDEX IF NOT EXISTS idx_transactions_date_customer 
ON transactions(transaction_date, customer_id) 
WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_date_payment 
ON transactions(transaction_date, payment_method);

-- Indexes for product performance queries
CREATE INDEX IF NOT EXISTS idx_transactions_product_date 
ON transactions(product_id, transaction_date);

CREATE INDEX IF NOT EXISTS idx_transactions_amount_desc 
ON transactions(amount DESC);

-- Partial indexes for active products only
CREATE INDEX IF NOT EXISTS idx_products_active_category 
ON products(category) 
WHERE is_active = true;

-- Indexes for customer analysis
CREATE INDEX IF NOT EXISTS idx_customers_last_seen 
ON customers(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_total_spent 
ON customers(total_spent DESC);

-- Create materialized views for heavy aggregations

-- Daily revenue materialized view (if not using the table approach)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_revenue AS
SELECT 
    transaction_date::date as date,
    SUM(amount) as total_revenue,
    COUNT(*) as transaction_count,
    COUNT(DISTINCT customer_id) as unique_customers,
    AVG(amount) as avg_transaction_value,
    SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_revenue,
    SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END) as card_revenue
FROM transactions 
GROUP BY transaction_date::date
ORDER BY date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_revenue_date 
ON mv_daily_revenue(date);

-- Hourly traffic materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hourly_traffic AS
SELECT 
    DATE_TRUNC('hour', transaction_datetime) as hour_period,
    EXTRACT(DOW FROM transaction_date) as day_of_week,
    EXTRACT(HOUR FROM transaction_datetime) as hour_of_day,
    COUNT(*) as transaction_count,
    SUM(amount) as revenue,
    COUNT(DISTINCT customer_id) as unique_customers
FROM transactions 
GROUP BY 
    DATE_TRUNC('hour', transaction_datetime),
    EXTRACT(DOW FROM transaction_date),
    EXTRACT(HOUR FROM transaction_datetime)
ORDER BY hour_period;

CREATE INDEX IF NOT EXISTS idx_mv_hourly_traffic_period 
ON mv_hourly_traffic(hour_period);

CREATE INDEX IF NOT EXISTS idx_mv_hourly_traffic_dow_hour 
ON mv_hourly_traffic(day_of_week, hour_of_day);

-- Product performance materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_performance AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.category,
    DATE_TRUNC('day', t.transaction_date) as date,
    SUM(t.amount) as revenue,
    SUM(t.quantity) as total_quantity,
    COUNT(t.id) as transaction_count,
    AVG(t.unit_price) as avg_price
FROM products p
JOIN transactions t ON p.id = t.product_id
GROUP BY p.id, p.name, p.category, DATE_TRUNC('day', t.transaction_date)
ORDER BY date DESC, revenue DESC;

CREATE INDEX IF NOT EXISTS idx_mv_product_performance_date 
ON mv_product_performance(date);

CREATE INDEX IF NOT EXISTS idx_mv_product_performance_product 
ON mv_product_performance(product_id, date);

-- Customer behavior materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_customer_behavior AS
SELECT 
    c.id as customer_id,
    c.first_seen_at,
    c.last_seen_at,
    COUNT(t.id) as total_transactions,
    SUM(t.amount) as total_spent,
    AVG(t.amount) as avg_transaction_value,
    COUNT(DISTINCT t.transaction_date::date) as unique_visit_days,
    MAX(t.transaction_datetime) - MIN(t.transaction_datetime) as customer_lifespan
FROM customers c
LEFT JOIN transactions t ON c.id = t.customer_id
GROUP BY c.id, c.first_seen_at, c.last_seen_at
ORDER BY total_spent DESC;

CREATE INDEX IF NOT EXISTS idx_mv_customer_behavior_spent 
ON mv_customer_behavior(total_spent DESC);

CREATE INDEX IF NOT EXISTS idx_mv_customer_behavior_transactions 
ON mv_customer_behavior(total_transactions DESC);

-- Functions for refreshing materialized views
CREATE OR REPLACE FUNCTION refresh_daily_revenue_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_hourly_traffic_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hourly_traffic;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_product_performance_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_performance;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_customer_behavior_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_behavior;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    PERFORM refresh_daily_revenue_mv();
    PERFORM refresh_hourly_traffic_mv();
    PERFORM refresh_product_performance_mv();
    PERFORM refresh_customer_behavior_mv();
    
    -- Log the refresh
    INSERT INTO materialized_view_refresh_log (refreshed_at, views_refreshed)
    VALUES (CURRENT_TIMESTAMP, ARRAY['mv_daily_revenue', 'mv_hourly_traffic', 'mv_product_performance', 'mv_customer_behavior']);
END;
$$ LANGUAGE plpgsql;

-- Create log table for materialized view refreshes
CREATE TABLE IF NOT EXISTS materialized_view_refresh_log (
    id SERIAL PRIMARY KEY,
    refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    views_refreshed TEXT[],
    duration INTERVAL
);

-- Optimized queries using the new indexes and materialized views

-- Create a function for fast revenue metrics
CREATE OR REPLACE FUNCTION get_revenue_metrics(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    total_revenue DECIMAL(12,2),
    transaction_count BIGINT,
    unique_customers BIGINT,
    avg_transaction_value DECIMAL(10,2),
    cash_revenue DECIMAL(12,2),
    card_revenue DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(dr.total_revenue)::DECIMAL(12,2),
        SUM(dr.transaction_count)::BIGINT,
        SUM(dr.unique_customers)::BIGINT,
        AVG(dr.avg_transaction_value)::DECIMAL(10,2),
        SUM(dr.cash_revenue)::DECIMAL(12,2),
        SUM(dr.card_revenue)::DECIMAL(12,2)
    FROM mv_daily_revenue dr
    WHERE dr.date >= start_date AND dr.date <= end_date;
END;
$$ LANGUAGE plpgsql;

-- Create a function for fast product performance
CREATE OR REPLACE FUNCTION get_product_performance(
    start_date DATE,
    end_date DATE,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    product_id UUID,
    product_name VARCHAR(255),
    category product_category,
    total_revenue DECIMAL(12,2),
    total_quantity BIGINT,
    transaction_count BIGINT,
    avg_price DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pp.product_id,
        pp.product_name,
        pp.category,
        SUM(pp.revenue)::DECIMAL(12,2),
        SUM(pp.total_quantity)::BIGINT,
        SUM(pp.transaction_count)::BIGINT,
        AVG(pp.avg_price)::DECIMAL(10,2)
    FROM mv_product_performance pp
    WHERE pp.date >= start_date AND pp.date <= end_date
    GROUP BY pp.product_id, pp.product_name, pp.category
    ORDER BY SUM(pp.revenue) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function for fast hourly traffic patterns
CREATE OR REPLACE FUNCTION get_hourly_traffic_patterns(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    hour_of_day INTEGER,
    avg_transaction_count DECIMAL(10,2),
    avg_revenue DECIMAL(10,2),
    avg_unique_customers DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ht.hour_of_day::INTEGER,
        AVG(ht.transaction_count)::DECIMAL(10,2),
        AVG(ht.revenue)::DECIMAL(10,2),
        AVG(ht.unique_customers)::DECIMAL(10,2)
    FROM mv_hourly_traffic ht
    WHERE ht.hour_period::date >= start_date AND ht.hour_period::date <= end_date
    GROUP BY ht.hour_of_day
    ORDER BY ht.hour_of_day;
END;
$$ LANGUAGE plpgsql;

-- Add table partitioning for large transaction tables (future optimization)
-- This would be implemented when the transaction table grows very large

-- Create a function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS void AS $$
BEGIN
    -- Update table statistics
    ANALYZE transactions;
    ANALYZE products;
    ANALYZE customers;
    ANALYZE daily_revenue_summary;
    ANALYZE product_performance_summary;
    ANALYZE hourly_traffic_summary;
    
    -- Log the analysis
    INSERT INTO query_performance_log (analyzed_at, tables_analyzed)
    VALUES (CURRENT_TIMESTAMP, ARRAY['transactions', 'products', 'customers', 'daily_revenue_summary', 'product_performance_summary', 'hourly_traffic_summary']);
END;
$$ LANGUAGE plpgsql;

-- Create log table for query performance analysis
CREATE TABLE IF NOT EXISTS query_performance_log (
    id SERIAL PRIMARY KEY,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tables_analyzed TEXT[]
);

-- Create indexes on the log tables
CREATE INDEX IF NOT EXISTS idx_mv_refresh_log_date 
ON materialized_view_refresh_log(refreshed_at);

CREATE INDEX IF NOT EXISTS idx_query_perf_log_date 
ON query_performance_log(analyzed_at);

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW mv_daily_revenue IS 'Pre-aggregated daily revenue metrics for fast dashboard queries';
COMMENT ON MATERIALIZED VIEW mv_hourly_traffic IS 'Pre-aggregated hourly traffic patterns for traffic analysis';
COMMENT ON MATERIALIZED VIEW mv_product_performance IS 'Pre-aggregated product performance metrics by day';
COMMENT ON MATERIALIZED VIEW mv_customer_behavior IS 'Pre-aggregated customer behavior metrics';

COMMENT ON FUNCTION refresh_all_materialized_views() IS 'Refreshes all materialized views used for analytics dashboards';
COMMENT ON FUNCTION get_revenue_metrics(DATE, DATE) IS 'Fast revenue metrics query using materialized views';
COMMENT ON FUNCTION get_product_performance(DATE, DATE, INTEGER) IS 'Fast product performance query using materialized views';
COMMENT ON FUNCTION get_hourly_traffic_patterns(DATE, DATE) IS 'Fast hourly traffic patterns query using materialized views';