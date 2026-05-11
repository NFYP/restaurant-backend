require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },   // this is crucial
  family: 4
});

async function test() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connected to Aiven PostgreSQL at:', res.rows[0].now);
    await pool.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}
test();
