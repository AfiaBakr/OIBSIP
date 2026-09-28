import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Admin from '../models/Admin.js';
import Inventory, { CATEGORIES } from '../models/Inventory.js';
import Order, { ADMIN_STATUSES } from '../models/Order.js';
import { requireAdmin } from '../middleware/auth.js';
import { runLowStockCheck } from '../services/lowStockJob.js';
import { emitInventoryUpdate, emitOrderUpdate } from '../services/socket.js';
import { env } from '../config/env.js';
import { badRequest, notFound, unauthorized } from '../utils/httpError.js';
import { signJwt } from '../utils/tokens.js';
import { requireEmail, requireObjectId, requireString } from '../utils/validate.js';

const router = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

router.post('/login', loginLimiter, async (req, res) => {
  const email = requireEmail(req.body.email);
  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin || !(await admin.comparePassword(String(req.body.password || '')))) {
    throw unauthorized('Invalid admin credentials');
  }
  res.json({ token: signJwt(admin._id, 'admin'), user: admin });
});

router.use(requireAdmin);

router.get('/me', (req, res) => res.json({ user: req.admin }));

// ---------- Inventory ----------

const toNonNegativeInt = (value, field) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw badRequest(`${field} must be a whole number of 0 or more`);
  return n;
};

router.get('/inventory', async (_req, res) => {
  res.json(await Inventory.find().sort({ category: 1, name: 1 }));
});

router.post('/inventory', async (req, res) => {
  const category = String(req.body.category);
  if (!CATEGORIES.includes(category)) throw badRequest('Invalid category');
  const price = Number(req.body.price);
  if (!(price >= 0)) throw badRequest('Price must be 0 or more');
  const item = await Inventory.create({
    category,
    name: requireString(req.body.name, 'Name', { max: 60 }),
    description: String(req.body.description || '').slice(0, 200),
    price,
    stock: toNonNegativeInt(req.body.stock ?? 0, 'Stock'),
    threshold: toNonNegativeInt(req.body.threshold ?? env.lowStock.threshold, 'Threshold'),
  });
  emitInventoryUpdate([item]);
  res.status(201).json(item);
});

// Set stock/threshold/price directly, or pass `adjust` (e.g. +50 or -5) to change stock relative
// to its current value, which is safe even while orders are coming in.
router.patch('/inventory/:id', async (req, res) => {
  const id = requireObjectId(req.params.id, 'item');
  const set = {};
  const inc = {};

  if (req.body.stock !== undefined) set.stock = toNonNegativeInt(req.body.stock, 'Stock');
  if (req.body.threshold !== undefined) set.threshold = toNonNegativeInt(req.body.threshold, 'Threshold');
  if (req.body.price !== undefined) {
    const price = Number(req.body.price);
    if (!(price >= 0)) throw badRequest('Price must be 0 or more');
    set.price = price;
  }
  if (req.body.adjust !== undefined) {
    if (set.stock !== undefined) throw badRequest('Send either stock or adjust, not both');
    const adjust = Number(req.body.adjust);
    if (!Number.isInteger(adjust) || adjust === 0) throw badRequest('Adjustment must be a non-zero whole number');
    inc.stock = adjust;
  }
  if (!Object.keys(set).length && !Object.keys(inc).length) throw badRequest('Nothing to update');

  const filter = { _id: id };
  if (inc.stock < 0) filter.stock = { $gte: -inc.stock };
  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(inc).length) update.$inc = inc;

  const item = await Inventory.findOneAndUpdate(filter, update, { returnDocument: 'after', runValidators: true });
  if (!item) {
    if (await Inventory.exists({ _id: id })) throw badRequest('Stock cannot go below 0');
    throw notFound('Inventory item not found');
  }
  emitInventoryUpdate([item]);
  res.json(item);
});

router.post('/inventory/check-low-stock', async (_req, res) => {
  res.json(await runLowStockCheck());
});

// ---------- Orders ----------

router.get('/orders', async (req, res) => {
  const filter = { 'payment.status': { $ne: 'created' } };
  if (req.query.status) filter.status = String(req.query.status);
  const orders = await Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).limit(200);
  res.json(orders);
});

router.patch('/orders/:id/status', async (req, res) => {
  const status = String(req.body.status);
  if (!ADMIN_STATUSES.includes(status)) throw badRequest('Invalid status');

  const order = await Order.findById(requireObjectId(req.params.id, 'order')).populate('user', 'name email');
  if (!order) throw notFound('Order not found');
  if (order.payment.status !== 'paid') throw badRequest('Only paid orders can be updated');
  if (['Delivered', 'Cancelled'].includes(order.status)) throw badRequest(`This order is already ${order.status.toLowerCase()}`);
  if (order.status === status) return res.json(order);

  order.status = status;
  order.statusHistory.push({ status });
  await order.save();
  emitOrderUpdate(order);
  res.json(order);
});

router.get('/stats', async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [byStatus, today, lowStock] = await Promise.all([
    Order.aggregate([{ $match: { 'payment.status': 'paid' } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { 'payment.status': 'paid', createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
    ]),
    Inventory.countDocuments({ $expr: { $lt: ['$stock', '$threshold'] } }),
  ]);
  res.json({
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    todayOrders: today[0]?.orders ?? 0,
    todayRevenue: today[0]?.revenue ?? 0,
    lowStock,
  });
});

export default router;
