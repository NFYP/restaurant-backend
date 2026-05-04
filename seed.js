const db = require('./database');

// Delete all existing menu items (clean slate)
db.prepare('DELETE FROM menu_items').run();
console.log('Cleared old menu items.');

const items = [
  {
    name: 'Margherita Pizza',
    price: 12.99,
    description: 'Fresh mozzarella, tomato sauce, basil, olive oil',
    image_url: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop'
  },
  {
    name: 'Pepperoni Pizza',
    price: 14.99,
    description: 'Spicy pepperoni, mozzarella, tomato sauce',
    image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop'
  },
  {
    name: 'Classic Burger',
    price: 8.99,
    description: 'Beef patty, lettuce, tomato, cheddar, special sauce',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop'
  },
  {
    name: 'BBQ Chicken Burger',
    price: 10.99,
    description: 'Grilled chicken, BBQ sauce, onion rings, cheddar',
    image_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop'
  },
  {
    name: 'Caesar Salad',
    price: 7.49,
    description: 'Romaine, parmesan, croutons, creamy caesar dressing',
    image_url: 'https://images.unsplash.com/photo-1550304943-4f24f54dd8c9?w=400&h=300&fit=crop'
  },
  {
    name: 'Greek Salad',
    price: 8.49,
    description: 'Feta, olives, cucumber, tomato, red onion, oregano',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'
  },
  {
    name: 'Spaghetti Carbonara',
    price: 13.99,
    description: 'Pancetta, egg, pecorino cheese, black pepper',
    image_url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=300&fit=crop'
  },
  {
    name: 'Fettuccine Alfredo',
    price: 12.99,
    description: 'Creamy parmesan sauce, garlic, parsley',
    image_url: 'https://images.unsplash.com/photo-1645112411344-0c6cf8a7d8a0?w=400&h=300&fit=crop'
  },
  {
    name: 'Chicken Wings (6 pcs)',
    price: 9.99,
    description: 'Buffalo or BBQ, served with ranch',
    image_url: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=400&h=300&fit=crop'
  },
  {
    name: 'Onion Rings',
    price: 4.99,
    description: 'Crispy battered onions, served with dipping sauce',
    image_url: 'https://images.unsplash.com/photo-1639024471283-035188dd12ef?w=400&h=300&fit=crop'
  },
  {
    name: 'Cheesecake',
    price: 5.99,
    description: 'New York style with berry sauce',
    image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop'
  },
  {
    name: 'Chocolate Lava Cake',
    price: 6.49,
    description: 'Warm chocolate cake with molten center, vanilla ice cream',
    image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop'
  }
];

const insert = db.prepare('INSERT INTO menu_items (name, price, description, image_url) VALUES (?, ?, ?, ?)');

for (const item of items) {
  insert.run(item.name, item.price, item.description, item.image_url);
  console.log(`Added: ${item.name}`);
}

console.log(`✅ Added ${items.length} menu items with images.`);
