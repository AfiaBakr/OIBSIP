import { Router } from 'express';
import Inventory, { CATEGORIES } from '../models/Inventory.js';
import Pizza from '../models/Pizza.js';
import { env, paymentMockMode } from '../config/env.js';
import { DELIVERY_FEE, FREE_DELIVERY_ABOVE } from '../services/stock.js';

// Public, read-only data used by the menu and the pizza builder. Stock counts are not exposed,
// only whether each ingredient is available.
const router = Router();

const publicIngredient = (i) => ({
  _id: i._id,
  category: i.category,
  name: i.name,
  description: i.description,
  price: i.price,
  available: i.stock > 0,
});

router.get('/ingredients', async (_req, res) => {
  const items = await Inventory.find().sort({ price: 1, name: 1 }).lean();
  const grouped = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
  for (const item of items) grouped[item.category].push(publicIngredient(item));
  res.json(grouped);
});

router.get('/pizzas', async (_req, res) => {
  const pizzas = await Pizza.find({ isActive: true }).populate('base sauce cheese veggies').sort({ name: 1 }).lean();
  res.json(
    pizzas.map((p) => {
      const parts = [p.base, p.sauce, p.cheese, ...p.veggies];
      return {
        _id: p._id,
        name: p.name,
        description: p.description,
        tag: p.tag,
        base: publicIngredient(p.base),
        sauce: publicIngredient(p.sauce),
        cheese: publicIngredient(p.cheese),
        veggies: p.veggies.map(publicIngredient),
        price: parts.reduce((sum, i) => sum + i.price, 0),
        available: parts.every((i) => i.stock > 0),
      };
    })
  );
});

router.get('/config', (_req, res) => {
  res.json({
    paymentMode: paymentMockMode ? 'mock' : 'razorpay',
    razorpayKeyId: paymentMockMode ? null : env.razorpay.keyId,
    deliveryFee: DELIVERY_FEE,
    freeDeliveryAbove: FREE_DELIVERY_ABOVE,
  });
});

export default router;
