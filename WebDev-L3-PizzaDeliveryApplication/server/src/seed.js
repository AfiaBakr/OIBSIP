// Creates the admin account and a starter menu. Safe to re-run: existing records are left alone,
// so stock levels an admin has changed are not reset. Prices are in Pakistani rupees (PKR).
// `npm run seed -- --reset-prices` also resets existing items' prices to the values below.
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import Admin from './models/Admin.js';
import Inventory from './models/Inventory.js';
import Pizza from './models/Pizza.js';

const T = env.lowStock.threshold;
const RESET_PRICES = process.argv.includes('--reset-prices');

const INVENTORY = [
  // 5 bases
  { category: 'base', name: 'Classic Hand-Tossed', description: 'Soft, airy and golden', price: 599, stock: 100 },
  { category: 'base', name: 'Thin Crust', description: 'Light and crispy', price: 549, stock: 100 },
  { category: 'base', name: 'Cheese Burst', description: 'Molten cheese inside the crust', price: 799, stock: 60 },
  { category: 'base', name: 'Whole Wheat', description: 'Wholesome and hearty', price: 649, stock: 80 },
  { category: 'base', name: 'Gluten-Free', description: 'Rice and millet flour base', price: 749, stock: 40 },
  // 5 sauces
  { category: 'sauce', name: 'Classic Tomato', description: 'Slow-cooked tomato and herbs', price: 99, stock: 120 },
  { category: 'sauce', name: 'Basil Pesto', description: 'Fresh basil, garlic and pine nuts', price: 179, stock: 60 },
  { category: 'sauce', name: 'Creamy Alfredo', description: 'Rich white garlic sauce', price: 179, stock: 60 },
  { category: 'sauce', name: 'Smoky BBQ', description: 'Sweet and smoky', price: 149, stock: 70 },
  { category: 'sauce', name: 'Spicy Arrabbiata', description: 'Tomato with red chilli', price: 149, stock: 70 },
  // cheeses
  { category: 'cheese', name: 'Mozzarella', description: 'The classic stretch', price: 199, stock: 150 },
  { category: 'cheese', name: 'Cheddar', description: 'Sharp and tangy', price: 249, stock: 80 },
  { category: 'cheese', name: 'Parmesan', description: 'Aged and nutty', price: 299, stock: 60 },
  { category: 'cheese', name: 'Vegan Cheese', description: 'Plant-based and dairy-free', price: 349, stock: 40 },
  // veggies
  { category: 'veggie', name: 'Onion', price: 60, stock: 200 },
  { category: 'veggie', name: 'Capsicum', price: 80, stock: 150 },
  { category: 'veggie', name: 'Tomato', price: 60, stock: 150 },
  { category: 'veggie', name: 'Mushroom', price: 120, stock: 100 },
  { category: 'veggie', name: 'Sweet Corn', price: 80, stock: 120 },
  { category: 'veggie', name: 'Black Olives', price: 150, stock: 80 },
  { category: 'veggie', name: 'Jalapeño', price: 99, stock: 80 },
  { category: 'veggie', name: 'Baby Spinach', price: 99, stock: 60 },
  { category: 'veggie', name: 'Paneer', price: 180, stock: 80 },
  { category: 'veggie', name: 'Red Paprika', price: 99, stock: 25 },
];

const PIZZAS = [
  { name: 'Margherita', tag: 'classic', description: 'Tomato sauce, mozzarella and a hint of basil. Simple and perfect.', base: 'Classic Hand-Tossed', sauce: 'Classic Tomato', cheese: 'Mozzarella', veggies: ['Tomato'] },
  { name: 'Farmhouse', tag: 'veg', description: 'Loaded with onion, capsicum, mushroom and tomato.', base: 'Classic Hand-Tossed', sauce: 'Classic Tomato', cheese: 'Mozzarella', veggies: ['Onion', 'Capsicum', 'Mushroom', 'Tomato'] },
  { name: 'Pesto Garden', tag: 'premium', description: 'Basil pesto, spinach, olives and parmesan on a thin crust.', base: 'Thin Crust', sauce: 'Basil Pesto', cheese: 'Parmesan', veggies: ['Baby Spinach', 'Black Olives', 'Tomato'] },
  { name: 'Mexican Fiesta', tag: 'spicy', description: 'Jalapeño, corn, capsicum and red paprika with spicy arrabbiata.', base: 'Classic Hand-Tossed', sauce: 'Spicy Arrabbiata', cheese: 'Cheddar', veggies: ['Jalapeño', 'Sweet Corn', 'Capsicum', 'Red Paprika'] },
  { name: 'Paneer Tikka BBQ', tag: 'spicy', description: 'Smoky BBQ sauce with paneer, onion and capsicum.', base: 'Whole Wheat', sauce: 'Smoky BBQ', cheese: 'Mozzarella', veggies: ['Paneer', 'Onion', 'Capsicum'] },
  { name: 'Cheese Lover', tag: 'premium', description: 'Cheese burst crust, alfredo sauce and a double hit of cheddar.', base: 'Cheese Burst', sauce: 'Creamy Alfredo', cheese: 'Cheddar', veggies: ['Sweet Corn'] },
  { name: 'Green Vegan', tag: 'veg', description: 'Gluten-free base with vegan cheese, spinach, mushroom and olives.', base: 'Gluten-Free', sauce: 'Classic Tomato', cheese: 'Vegan Cheese', veggies: ['Baby Spinach', 'Mushroom', 'Black Olives'] },
];

await connectDB();

if (!env.admin.email || !env.admin.password) {
  console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set, skipping admin account');
} else if (await Admin.exists({ email: env.admin.email.toLowerCase() })) {
  console.log(`Admin ${env.admin.email} already exists`);
} else {
  await Admin.create({ name: env.admin.name, email: env.admin.email, password: env.admin.password });
  console.log(`Created admin ${env.admin.email}`);
}

let created = 0;
for (const { price, ...item } of INVENTORY) {
  const res = await Inventory.updateOne(
    { category: item.category, name: item.name },
    RESET_PRICES
      ? { $set: { price }, $setOnInsert: { description: '', threshold: T, ...item } }
      : { $setOnInsert: { description: '', threshold: T, ...item, price } },
    { upsert: true }
  );
  created += res.upsertedCount;
}
console.log(`Inventory: ${created} new item(s), ${INVENTORY.length - created} already present`);

const all = await Inventory.find().lean();
const idOf = (category, name) => {
  const item = all.find((i) => i.category === category && i.name === name);
  if (!item) throw new Error(`Seed data references missing ${category} "${name}"`);
  return item._id;
};

created = 0;
for (const p of PIZZAS) {
  const res = await Pizza.updateOne(
    { name: p.name },
    {
      $setOnInsert: {
        ...p,
        base: idOf('base', p.base),
        sauce: idOf('sauce', p.sauce),
        cheese: idOf('cheese', p.cheese),
        veggies: p.veggies.map((v) => idOf('veggie', v)),
      },
    },
    { upsert: true }
  );
  created += res.upsertedCount;
}
console.log(`Pizzas: ${created} new variety(ies), ${PIZZAS.length - created} already present`);

await mongoose.disconnect();
