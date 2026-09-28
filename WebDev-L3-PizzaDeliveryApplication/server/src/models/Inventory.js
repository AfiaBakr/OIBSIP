import mongoose from 'mongoose';

export const CATEGORIES = ['base', 'sauce', 'cheese', 'veggie'];

const inventorySchema = new mongoose.Schema(
  {
    category: { type: String, enum: CATEGORIES, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    threshold: { type: Number, required: true, min: 0, default: 20 },
    unit: { type: String, default: 'units' },
    // Set when a low-stock email goes out; cleared once stock is back at or above the threshold,
    // so the admin gets one alert per shortage instead of one every cron run.
    lowStockAlertedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

inventorySchema.index({ category: 1, name: 1 }, { unique: true });

inventorySchema.virtual('isLow').get(function isLow() {
  return this.stock < this.threshold;
});

inventorySchema.set('toJSON', { virtuals: true, versionKey: false });

export default mongoose.model('Inventory', inventorySchema);
