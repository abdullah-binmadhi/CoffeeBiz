import { Pool } from 'pg';
import { createError } from '../middleware/errorHandler';

// Database connection pool
let pool: Pool;

export const initializeDatabase = () => {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'coffeebiz_analytics',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
};

export const getDatabase = () => {
  if (!pool) {
    initializeDatabase();
  }
  return pool;
};

export const query = async (text: string, params?: any[]) => {
  const client = getDatabase();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw createError('Database query failed', 500, 'DB_QUERY_ERROR');
  }
};

export const closeDatabase = async () => {
  if (pool) {
    await pool.end();
  }
};