import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';

// Database configuration interface
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
}

// Default configuration (can be overridden by environment variables)
const defaultConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'coffeebiz_analytics',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
};

// Database connection pool
export class DatabaseConnection {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig = defaultConfig) {
    this.config = config;
    
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      max: config.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    if (config.ssl) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  // Get a client from the pool
  async getClient() {
    return await this.pool.connect();
  }

  // Execute a query
  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Query error', { text, error });
      throw error;
    }
  }

  // Test the connection
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      console.log('Database connection successful:', result.rows[0].current_time);
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  // Close all connections
  async close() {
    await this.pool.end();
  }

  // Get pool statistics
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

// Migration runner
export class MigrationRunner {
  private db: DatabaseConnection;
  private migrationsPath: string;

  constructor(db: DatabaseConnection, migrationsPath: string = path.join(__dirname, 'migrations')) {
    this.db = db;
    this.migrationsPath = migrationsPath;
  }

  // Create migrations table if it doesn't exist
  private async createMigrationsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await this.db.query(createTableQuery);
  }

  // Get list of executed migrations
  private async getExecutedMigrations(): Promise<string[]> {
    const result = await this.db.query('SELECT filename FROM migrations ORDER BY id');
    return result.rows.map(row => row.filename);
  }

  // Get list of available migration files
  private getAvailableMigrations(): string[] {
    if (!fs.existsSync(this.migrationsPath)) {
      console.warn(`Migrations directory not found: ${this.migrationsPath}`);
      return [];
    }

    return fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();
  }

  // Execute a single migration
  private async executeMigration(filename: string) {
    const filePath = path.join(this.migrationsPath, filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`Executing migration: ${filename}`);
    
    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');
      
      // Execute the migration SQL
      await client.query(sql);
      
      // Record the migration as executed
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      await client.query('COMMIT');
      console.log(`Migration completed: ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Migration failed: ${filename}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Run all pending migrations
  async runMigrations() {
    try {
      await this.createMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const availableMigrations = this.getAvailableMigrations();
      
      const pendingMigrations = availableMigrations.filter(
        migration => !executedMigrations.includes(migration)
      );

      if (pendingMigrations.length === 0) {
        console.log('No pending migrations');
        return;
      }

      console.log(`Found ${pendingMigrations.length} pending migrations`);
      
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration process failed:', error);
      throw error;
    }
  }

  // Rollback the last migration (basic implementation)
  async rollbackLastMigration() {
    const result = await this.db.query(
      'SELECT filename FROM migrations ORDER BY id DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigration = result.rows[0].filename;
    console.warn(`Rolling back migration: ${lastMigration}`);
    
    // Note: This is a basic implementation. In a production system,
    // you would want to have proper rollback scripts for each migration.
    await this.db.query(
      'DELETE FROM migrations WHERE filename = $1',
      [lastMigration]
    );

    console.log(`Rollback completed for: ${lastMigration}`);
    console.warn('Note: This only removes the migration record. Manual cleanup may be required.');
  }
}

// Singleton instance
let dbInstance: DatabaseConnection | null = null;

export function getDatabase(config?: DatabaseConfig): DatabaseConnection {
  if (!dbInstance) {
    dbInstance = new DatabaseConnection(config);
  }
  return dbInstance;
}

export async function closeDatabaseConnection() {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}