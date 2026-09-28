import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

export const ORDER_STATUSES = [
  'Pending Payment',
  'Order Received',
  'In Kitchen',
  'Sent to Delivery',
  'Delivered',
  'Cancelled',
];

// Statuses an admin can move a paid order into.
export const ADMIN_STATUSES = ['Order Received', 'In Kitchen', 'Sent to Delivery', 'Delivered', 'Cancelled'];

const ingredientSnapshot = new mongoose.Schema(
  { item: { type: ObjectId, ref: 'Inventory' }, name: String, price: Number },
  { _id: false }
);

// Ingredient names and prices are copied into the order so later menu edits don't rewrite history.
const orderItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    pizza: { type: ObjectId, ref: 'Pizza' },
    base: ingredientSnapshot,
    sauce: ingredientSnapshot,
    cheese: ingredientSnapshot,
    veggies: [ingredientSnapshot],
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, max: 10 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    total: { type: Number, required: true },
    deliveryAddress: { type: String, required: true },
    phone: { type: String, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'Pending Payment', index: true },
    statusHistory: [{ status: String, at: { type: Date, default: Date.now }, _id: false }],
    payment: {
      provider: { type: String, enum: ['razorpay', 'mock'], required: true },
      status: { type: String, enum: ['created', 'paid', 'failed', 'refund_pending'], default: 'created' },
      razorpayOrderId: { type: String, index: true },
      razorpayPaymentId: String,
      razorpaySignature: String,
      paidAt: Date,
    },
    stockDeducted: { type: Boolean, default: false },
    note: String,
  },
  { timestamps: true }
);

orderSchema.set('toJSON', { versionKey: false });

export default mongoose.model('Order', orderSchema);
