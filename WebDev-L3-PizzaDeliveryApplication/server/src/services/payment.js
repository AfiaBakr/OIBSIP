import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env, paymentMockMode } from '../config/env.js';

const razorpay = paymentMockMode
  ? null
  : new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });

export const paymentProvider = paymentMockMode ? 'mock' : 'razorpay';

// Prices are in Pakistani rupees. Charging PKR through Razorpay requires international
// payments to be enabled on the Razorpay account.
const CURRENCY = 'PKR';

/** Creates the payment-side order. Amount is in rupees; Razorpay expects the smallest unit (paisa), so x100. */
export async function createPaymentOrder(order) {
  if (!razorpay) return { id: `mock_${order._id}`, amount: order.total * 100, currency: CURRENCY };
  return razorpay.orders.create({
    amount: Math.round(order.total * 100),
    currency: CURRENCY,
    receipt: String(order._id),
    notes: { orderId: String(order._id) },
  });
}

/** Checks the signature Razorpay returns to the browser after a successful payment. */
export function isValidRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) return false;
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(razorpaySignature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
