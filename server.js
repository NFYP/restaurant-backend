const express = require('express');
const app = express();
const port = 3000;
const db = require('./database');
const { hashPassword, verifyPassword, generateToken, verifyToken } = require('./auth');
const cors = require('cors');

app.use(express.json());
app.use(cors()); 
// ========== MIDDLEWARE ==========
// Check if user is owner
function isOwner(req, res, next) {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied. Owner only.' });
  }
  next();
}

// ========== PUBLIC ROUTES ==========
app.get('/menu', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, price, description, image_url, is_available FROM menu_items WHERE is_available = 1').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/register', (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashedPassword = hashPassword(password);
    const insert = db.prepare('INSERT INTO users (email, password, full_name, phone) VALUES (?, ?, ?, ?)');
    const result = insert.run(email, hashedPassword, full_name, phone || null);
    const user = { id: result.lastInsertRowid, email, role: 'customer' };
    const token = generateToken(user);
    res.json({ message: 'Registration successful', token, user: { id: user.id, email, full_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CUSTOMER PROTECTED ROUTES ==========
app.post('/orders', verifyToken, (req, res) => {
  try {
    const { items, delivery_address } = req.body;
    const userId = req.user.id;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in order' });
    }
    let total_price = 0;
    for (const item of items) {
      const menuItem = db.prepare('SELECT price FROM menu_items WHERE id = ?').get(item.menu_item_id);
      if (!menuItem) {
        return res.status(400).json({ error: `Menu item ${item.menu_item_id} not found` });
      }
      total_price += menuItem.price * item.quantity;
    }
    const insertOrder = db.prepare('INSERT INTO orders (user_id, total_price, delivery_address) VALUES (?, ?, ?)');
    const result = insertOrder.run(userId, total_price, delivery_address || '');
    const order_id = result.lastInsertRowid;
    const insertOrderItem = db.prepare('INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_time) VALUES (?, ?, ?, ?)');
    for (const item of items) {
      const menuItem = db.prepare('SELECT price FROM menu_items WHERE id = ?').get(item.menu_item_id);
      insertOrderItem.run(order_id, item.menu_item_id, item.quantity, menuItem.price);
    }
    const pointsEarned = Math.floor(total_price);
    db.prepare('UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?').run(pointsEarned, userId);
    res.json({ success: true, order_id, total_price, points_earned: pointsEarned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/my-orders', verifyToken, (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/my-points', verifyToken, (req, res) => {
  try {
    const user = db.prepare('SELECT loyalty_points FROM users WHERE id = ?').get(req.user.id);
    res.json({ points: user.loyalty_points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== OWNER ONLY ROUTES ==========

// Get all orders (with customer names)
app.get('/owner/orders', verifyToken, isOwner, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT o.*, u.full_name as customer_name, u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `).all();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status
app.patch('/owner/orders/:id/status', verifyToken, isOwner, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const update = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
    const result = update.run(status, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, order_id: id, new_status: status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get sales report (today or this week)
app.get('/owner/sales', verifyToken, isOwner, (req, res) => {
  try {
    const { period } = req.query; // 'today' or 'week'
    let dateFilter = '';
    if (period === 'today') {
      dateFilter = "DATE(created_at) = DATE('now')";
    } else if (period === 'week') {
      dateFilter = "created_at >= DATE('now', '-7 days')";
    } else {
      return res.status(400).json({ error: "Period must be 'today' or 'week'" });
    }
    
    const query = `
      SELECT 
        SUM(total_price) as total_sales,
        COUNT(*) as total_orders,
        AVG(total_price) as average_order_value
      FROM orders
      WHERE ${dateFilter} AND status != 'cancelled'
    `;
    const result = db.prepare(query).get();
    res.json({
      period: period,
      total_sales: result.total_sales || 0,
      total_orders: result.total_orders || 0,
      average_order_value: result.average_order_value || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all customers (owner only)
app.get('/owner/customers', verifyToken, isOwner, (req, res) => {
  try {
    const customers = db.prepare('SELECT id, email, full_name, phone, loyalty_points, created_at FROM users WHERE role = "customer"').all();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== START SERVER ==========
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
