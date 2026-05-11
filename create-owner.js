require('dotenv').config();
const query = require('./database');
const { hashPassword } = require('./auth');

async function createOwner() {
  const email = 'owner@restaurant.com';
  const password = 'owner123';
  const full_name = 'Restaurant Owner';
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    console.log('Owner already exists');
    return;
  }
  const hashed = hashPassword(password);
  await query('INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4)', [email, hashed, full_name, 'owner']);
  console.log('Owner created');
}
createOwner().catch(console.error);
