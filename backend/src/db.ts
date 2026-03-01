import { Pool } from 'pg';

// One connection pool shared across the whole app.
// In Session 2 we replace this with Prisma — but starting with raw pg
// lets you see a DB connection with zero magic.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (err) {
    console.error('Database connection failed:', err);
    return false;
  }
}

export default pool;
