import { Pool } from 'pg';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_6urXDJlGFCy1@ep-proud-cell-a4i2s76h-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false // Required for Neon PostgreSQL
  },
  max: 10, // Maximum number of clients in the pool (reduced for better resource management)
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 10000, // Increased timeout for build time (10 seconds)
  query_timeout: 30000, // Query timeout (30 seconds)
  statement_timeout: 30000, // Statement timeout (30 seconds)
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
