import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// A preset variety shown on the user dashboard. It is a saved combination of inventory items,
// so ordering one uses stock exactly like a custom pizza does.
const pizzaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    tag: { type: String, enum: ['veg', 'classic', 'spicy', 'premium'], default: 'classic' },
    base: { type: ObjectId, ref: 'Inventory', required: true },
    sauce: { type: ObjectId, ref: 'Inventory', required: true },
    cheese: { type: ObjectId, ref: 'Inventory', required: true },
    veggies: [{ type: ObjectId, ref: 'Inventory' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pizzaSchema.set('toJSON', { versionKey: false });

export default mongoose.model('Pizza', pizzaSchema);
