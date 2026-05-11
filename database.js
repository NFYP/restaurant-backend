require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4
});

async function query(sql, params) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function initTables() {
  console.log('Creating tables if not exist...');
  await query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      description TEXT,
      image_url TEXT,
      is_available INT DEFAULT 1
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'customer',
      loyalty_points INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      total_price DECIMAL(10,2) NOT NULL,
      status TEXT DEFAULT 'pending',
      delivery_address TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INT REFERENCES orders(id),
      menu_item_id INT REFERENCES menu_items(id),
      quantity INT NOT NULL,
      price_at_time DECIMAL(10,2) NOT NULL
    )
  `);
  console.log('Tables ready');
}

initTables().catch(console.error);

module.exports = query;
