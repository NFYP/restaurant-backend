const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const SECRET_KEY = 'your_super_secret_key_change_this_later';

// Hash a password
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// Check if password matches
function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// Create a JWT token for a user
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '7d' });
}

// Verify a token (middleware)
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1]; // Bearer TOKEN
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken
};
