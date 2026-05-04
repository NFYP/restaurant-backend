const db = require('./database');

// Free stock food images from Unsplash (via placeholder images)
const updates = [
  { id: 1, url: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=300&h=200&fit=crop' },  // Pizza
  { id: 2, url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop' },  // Burger
  { id: 3, url: 'https://images.unsplash.com/photo-1550304943-4f24f54dd8d1?w=300&h=200&fit=crop' }     // Salad
];

const updateStmt = db.prepare('UPDATE menu_items SET image_url = ? WHERE id = ?');

for (const item of updates) {
  updateStmt.run(item.url, item.id);
  console.log(`Updated item ID ${item.id} with image`);
}

console.log('Done!');
