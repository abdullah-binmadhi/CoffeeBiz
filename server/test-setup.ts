import { beforeAll, afterAll } from 'vitest';
import { initializeDatabase, closeDatabase } from './services/database';

beforeAll(async () => {
  // Initialize test database connection
  initializeDatabase();
});

afterAll(async () => {
  // Close database connection
  await closeDatabase();
});