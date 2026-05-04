const db = require('./database');
const { hashPassword } = require('./auth');

const email = 'owner@restaurant.com';
const password = 'owner123';
const full_name = 'Restaurant Owner';

try {
  // Check if owner already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    console.log('Owner already exists!');
    process.exit(0);
  }
  
  const hashedPassword = hashPassword(password);
  const insert = db.prepare('INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)');
  insert.run(email, hashedPassword, full_name, 'owner');
  
  console.log('Owner account created!');
  console.log('Email:', email);
  console.log('Password:', password);
} catch (err) {
  console.error('Error:', err.message);
}
