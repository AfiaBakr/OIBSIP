import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Admins live in their own collection, so the public registration flow can never create one.
// The admin account is created by `npm run seed`.
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

adminSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

adminSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

adminSchema.methods.toJSON = function toJSON() {
  return { id: this._id, name: this.name, email: this.email, role: 'admin' };
};

export default mongoose.model('Admin', adminSchema);
