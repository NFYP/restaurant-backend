require('dotenv').config();
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ exists' : '❌ missing');
console.log('First 20 chars:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) : 'none');
