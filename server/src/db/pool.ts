import pg from 'pg';
import { config } from '../config.ts';

export const pool = new pg.Pool({
  connectionString: config.db.connectionString,
  max: 20,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});
