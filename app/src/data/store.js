const bcrypt = require('bcryptjs');

// In-memory data only — this is intentional. The point of the capstone is
// infrastructure/security/observability, not database design. Do not add a
// real database here; that would shift focus away from the learning goals.

const users = [
  { id: 1, username: 'alice', email: 'alice@startup.dev', passwordHash: bcrypt.hashSync('Alice#2024', 8), role: 'user' },
  { id: 2, username: 'bob', email: 'bob@startup.dev', passwordHash: bcrypt.hashSync('Bob#2024', 8), role: 'user' },
  { id: 3, username: 'carol', email: 'carol@startup.dev', passwordHash: bcrypt.hashSync('Carol#2024', 8), role: 'user' },
  { id: 4, username: 'admin', email: 'admin@startup.dev', passwordHash: bcrypt.hashSync('S3cur3AdminPass!', 8), role: 'admin' },
];

const products = [
  { id: 1, name: 'Starter Plan', category: 'subscription', price: 9.99, stock: 9999 },
  { id: 2, name: 'Growth Plan', category: 'subscription', price: 29.99, stock: 9999 },
  { id: 3, name: 'Scale Plan', category: 'subscription', price: 99.99, stock: 9999 },
  { id: 4, name: 'API Add-on Pack', category: 'addon', price: 4.99, stock: 500 },
  { id: 5, name: 'Priority Support', category: 'addon', price: 14.99, stock: 500 },
  { id: 6, name: 'Custom Onboarding', category: 'service', price: 199.0, stock: 20 },
];

const orders = [];
let nextOrderId = 1;

function createOrder(userId, productId, quantity) {
  const product = products.find((p) => p.id === productId);
  if (!product) return null;
  const order = {
    id: nextOrderId++,
    userId,
    productId,
    quantity,
    total: Number((product.price * quantity).toFixed(2)),
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  return order;
}

module.exports = { users, products, orders, createOrder };
