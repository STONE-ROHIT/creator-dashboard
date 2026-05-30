import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Support both DATABASE_URL (cloud) and individual params (local)
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME     || 'creator_dashboard',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

// Log connection errors without crashing
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

// Test connection on startup
pool.query('SELECT 1').then(() => {
  console.log('✓ Database connected');
}).catch((err) => {
  console.error('✗ Database connection failed:', err.message);
  console.error('  Check your DB_* environment variables or DATABASE_URL');
});

export default pool;
