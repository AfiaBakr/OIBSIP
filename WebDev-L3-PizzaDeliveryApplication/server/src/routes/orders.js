import { Router } from 'express';
import Order from '../models/Order.js';
import { requireUser } from '../middleware/auth.js';
import { createPaymentOrder, isValidRazorpaySignature, paymentProvider } from '../services/payment.js';
import { emitInventoryUpdate, emitOrderUpdate } from '../services/socket.js';
import { buildOrderItems, deductStock, findShortages, priceOrder } from '../services/stock.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { requireObjectId, requireString } from '../utils/validate.js';

const router = Router();
router.use(requireUser);

async function findOwnOrder(req) {
  const order = await Order.findOne({ _id: requireObjectId(req.params.id, 'order'), user: req.user._id });
  if (!order) throw notFound('Order not found');
  return order;
}

// Step 1 of checkout: price the cart on the server, check stock, and open a payment order.
router.post('/', async (req, res) => {
  const items = await buildOrderItems(req.body.items);
  const deliveryAddress = requireString(req.body.deliveryAddress, 'Delivery address', { max: 300 });
  const phone = requireString(req.body.phone, 'Phone number', { max: 20 });
  if (!/^[+\d][\d\s-]{6,}$/.test(phone)) throw badRequest('Please enter a valid phone number');

  const shortages = await findShortages(items);
  if (shortages.length) {
    throw conflict(`Not enough stock for: ${shortages.map((s) => s.name).join(', ')}`, { shortages });
  }

  const order = new Order({
    user: req.user._id,
    items,
    ...priceOrder(items),
    deliveryAddress,
    phone,
    payment: { provider: paymentProvider },
    statusHistory: [{ status: 'Pending Payment' }],
  });
  const paymentOrder = await createPaymentOrder(order);
  order.payment.razorpayOrderId = paymentOrder.id;
  await order.save();

  // Remember address and phone for next time.
  if (!req.user.address || !req.user.phone) {
    req.user.address ||= deliveryAddress;
    req.user.phone ||= phone;
    await req.user.save();
  }

  res.status(201).json({
    order,
    payment: {
      provider: paymentProvider,
      orderId: paymentOrder.id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
    },
  });
});

// Step 2 of checkout: confirm the payment, deduct stock, and send the order to the kitchen.
router.post('/:id/verify', async (req, res) => {
  const order = await findOwnOrder(req);
  if (order.payment.status === 'paid') return res.json({ order });
  if (order.status !== 'Pending Payment') throw badRequest('This order can no longer be paid');

  let paymentUpdate;
  if (order.payment.provider === 'mock') {
    if (req.body.mockOutcome !== 'success') throw badRequest('Payment was not successful');
    paymentUpdate = { 'payment.razorpayPaymentId': `mock_pay_${Date.now()}` };
  } else {
    const { razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, razorpay_signature: razorpaySignature } = req.body;
    if (razorpayOrderId !== order.payment.razorpayOrderId) throw badRequest('Payment does not match this order');
    if (!isValidRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature })) {
      throw badRequest('Payment verification failed');
    }
    paymentUpdate = { 'payment.razorpayPaymentId': razorpayPaymentId, 'payment.razorpaySignature': razorpaySignature };
  }

  // Claim the order atomically so a double submit can't deduct stock twice.
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, 'payment.status': 'created' },
    { $set: { ...paymentUpdate, 'payment.status': 'paid', 'payment.paidAt': new Date() } },
    { returnDocument: 'after' }
  );
  if (!claimed) return res.json({ order: await Order.findById(order._id) });
  await claimed.populate('user', 'name email');

  try {
    const updatedStock = await deductStock(claimed.items);
    claimed.stockDeducted = true;
    claimed.status = 'Order Received';
    claimed.statusHistory.push({ status: 'Order Received' });
    await claimed.save();
    emitInventoryUpdate(updatedStock);
    emitOrderUpdate(claimed, { isNew: true });
    res.json({ order: claimed });
  } catch (err) {
    // Paid, but an ingredient sold out between checkout and payment. Cancel and flag for refund.
    claimed.status = 'Cancelled';
    claimed.payment.status = 'refund_pending';
    claimed.note = err.message;
    claimed.statusHistory.push({ status: 'Cancelled' });
    await claimed.save();
    emitOrderUpdate(claimed);
    throw conflict(`${err.message}. Your order was cancelled and your payment will be refunded.`, { order: claimed });
  }
});

// Called when the user closes the checkout or the payment fails, so the order isn't left dangling.
router.post('/:id/cancel', async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: requireObjectId(req.params.id, 'order'), user: req.user._id, status: 'Pending Payment', 'payment.status': 'created' },
    { $set: { status: 'Cancelled', 'payment.status': 'failed' }, $push: { statusHistory: { status: 'Cancelled' } } },
    { returnDocument: 'after' }
  );
  if (!order) throw badRequest('This order cannot be cancelled');
  res.json({ order });
});

router.get('/mine', async (req, res) => {
  const orders = await Order.find({ user: req.user._id, 'payment.status': { $ne: 'created' } })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(orders);
});

router.get('/:id', async (req, res) => {
  res.json(await findOwnOrder(req));
});

export default router;
