require('dotenv').config();
const express = require('express');
const cors = require('cors');
const query = require('./database');
const { hashPassword, verifyPassword, generateToken, verifyToken } = require('./auth');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/ping', (req, res) => res.send('pong'));

// Menu
app.get('/menu', async (req, res) => {
  try {
    const result = await query('SELECT id, name, price, description, image_url, is_available FROM menu_items WHERE is_available = 1');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Register
app.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;
    if (!email || !password || !full_name) return res.status(400).json({ error: 'Missing fields' });
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return res.status(400).json({ error: 'Email exists' });
    const hashedPassword = hashPassword(password);
    const result = await query(
      'INSERT INTO users (email, password, full_name, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [email, hashedPassword, full_name, phone || null, 'customer']
    );
    const user = { id: result.rows[0].id, email, role: 'customer' };
    const token = generateToken(user);
    res.json({ message: 'Registered', token, user: { id: user.id, email, full_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({ message: 'Logged in', token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Place order
app.post('/orders', verifyToken, async (req, res) => {
  try {
    const { items, delivery_address } = req.body;
    const userId = req.user.id;
    if (!items || items.length === 0) return res.status(400).json({ error: 'No items' });
    let total = 0;
    for (const item of items) {
      const menuResult = await query('SELECT price FROM menu_items WHERE id = $1', [item.menu_item_id]);
      if (!menuResult.rows.length) return res.status(400).json({ error: `Item ${item.menu_item_id} not found` });
      total += menuResult.rows[0].price * item.quantity;
    }
    const orderResult = await query(
      'INSERT INTO orders (user_id, total_price, delivery_address) VALUES ($1, $2, $3) RETURNING id',
      [userId, total, delivery_address || '']
    );
    const orderId = orderResult.rows[0].id;
    for (const item of items) {
      const priceResult = await query('SELECT price FROM menu_items WHERE id = $1', [item.menu_item_id]);
      const priceAtTime = priceResult.rows[0].price;
      await query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_time) VALUES ($1, $2, $3, $4)',
        [orderId, item.menu_item_id, item.quantity, priceAtTime]
      );
    }
    const points = Math.floor(total);
    await query('UPDATE users SET loyalty_points = loyalty_points + $1 WHERE id = $2', [points, userId]);
    res.json({ success: true, order_id: orderId, total_price: total, points_earned: points });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// My orders
app.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// My points
app.get('/my-points', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT loyalty_points FROM users WHERE id = $1', [req.user.id]);
    res.json({ points: result.rows[0]?.loyalty_points || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Owner: all orders
app.get('/owner/orders', verifyToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Owner only' });
  try {
    const result = await query(`
      SELECT o.*, u.full_name as customer_name, u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Owner: update status
app.patch('/owner/orders/:id/status', verifyToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Owner only' });
  try {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const result = await query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Owner: sales report
app.get('/owner/sales', verifyToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Owner only' });
  try {
    const { period } = req.query;
    let dateFilter = '';
    if (period === 'today') dateFilter = "DATE(created_at) = CURRENT_DATE";
    else if (period === 'week') dateFilter = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
    else return res.status(400).json({ error: "Period must be 'today' or 'week'" });
    const result = await query(`
      SELECT COALESCE(SUM(total_price), 0) as total_sales, COUNT(*) as total_orders, COALESCE(AVG(total_price), 0) as average_order_value
      FROM orders
      WHERE ${dateFilter} AND status != 'cancelled'
    `);
    res.json({
      period,
      total_sales: parseFloat(result.rows[0].total_sales),
      total_orders: parseInt(result.rows[0].total_orders),
      average_order_value: parseFloat(result.rows[0].average_order_value)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
