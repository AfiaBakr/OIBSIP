import Inventory from '../models/Inventory.js';
import Pizza from '../models/Pizza.js';
import { badRequest, conflict } from '../utils/httpError.js';
import { requireObjectId } from '../utils/validate.js';

export const DELIVERY_FEE = 150;
export const FREE_DELIVERY_ABOVE = 2500;
const MAX_ITEMS = 20;
const MAX_VEGGIES = 8;

const snapshot = (item) => ({ item: item._id, name: item.name, price: item.price });

/**
 * Turns the cart sent by the client into priced order lines. Prices always come from the
 * database, never from the client. Each cart entry is either { pizzaId, quantity } for a preset
 * variety or { base, sauce, cheese, veggies, quantity } for a custom pizza.
 */
export async function buildOrderItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw badRequest('Your cart is empty');
  if (rawItems.length > MAX_ITEMS) throw badRequest(`You can order at most ${MAX_ITEMS} pizzas at once`);

  const pizzaIds = rawItems.filter((i) => i.pizzaId).map((i) => requireObjectId(i.pizzaId, 'pizza'));
  const pizzas = await Pizza.find({ _id: { $in: pizzaIds }, isActive: true }).lean();
  const pizzaById = new Map(pizzas.map((p) => [String(p._id), p]));

  // Resolve every entry to ingredient ids first, then load all ingredients in one query.
  const resolved = rawItems.map((raw) => {
    const quantity = Number(raw.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw badRequest('Quantity must be a whole number between 1 and 10');
    }
    if (raw.pizzaId) {
      const pizza = pizzaById.get(String(raw.pizzaId));
      if (!pizza) throw badRequest('One of the pizzas in your cart is no longer available');
      return { name: pizza.name, pizza: pizza._id, base: pizza.base, sauce: pizza.sauce, cheese: pizza.cheese, veggies: pizza.veggies, quantity };
    }
    const veggies = Array.isArray(raw.veggies) ? [...new Set(raw.veggies.map(String))] : [];
    if (veggies.length > MAX_VEGGIES) throw badRequest(`Choose at most ${MAX_VEGGIES} vegetables`);
    return {
      name: 'Custom Pizza',
      base: requireObjectId(raw.base, 'pizza base'),
      sauce: requireObjectId(raw.sauce, 'sauce'),
      cheese: requireObjectId(raw.cheese, 'cheese'),
      veggies: veggies.map((v) => requireObjectId(v, 'vegetable')),
      quantity,
    };
  });

  const ids = new Set(resolved.flatMap((r) => [r.base, r.sauce, r.cheese, ...r.veggies].map(String)));
  const ingredients = await Inventory.find({ _id: { $in: [...ids] } }).lean();
  const byId = new Map(ingredients.map((i) => [String(i._id), i]));

  const pick = (id, category, label) => {
    const item = byId.get(String(id));
    if (!item || item.category !== category) throw badRequest(`Invalid ${label} selected`);
    return item;
  };

  return resolved.map((r) => {
    const base = pick(r.base, 'base', 'pizza base');
    const sauce = pick(r.sauce, 'sauce', 'sauce');
    const cheese = pick(r.cheese, 'cheese', 'cheese');
    const veggies = r.veggies.map((v) => pick(v, 'veggie', 'vegetable'));
    const unitPrice = [base, sauce, cheese, ...veggies].reduce((sum, i) => sum + i.price, 0);
    return {
      name: r.name,
      pizza: r.pizza,
      base: snapshot(base),
      sauce: snapshot(sauce),
      cheese: snapshot(cheese),
      veggies: veggies.map(snapshot),
      unitPrice,
      quantity: r.quantity,
    };
  });
}

export function priceOrder(items) {
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

/** Units of each inventory item an order consumes: one of each ingredient per pizza. */
export function stockRequirements(items) {
  const need = new Map();
  for (const line of items) {
    for (const ing of [line.base, line.sauce, line.cheese, ...line.veggies]) {
      const id = String(ing.item);
      need.set(id, (need.get(id) || 0) + line.quantity);
    }
  }
  return need;
}

export async function findShortages(items) {
  const need = stockRequirements(items);
  const stock = await Inventory.find({ _id: { $in: [...need.keys()] } }).lean();
  return stock
    .filter((s) => s.stock < need.get(String(s._id)))
    .map((s) => ({ name: s.name, needed: need.get(String(s._id)), available: s.stock }));
}

/**
 * Decrements stock for an order. Each decrement is conditional on enough stock remaining, so two
 * concurrent orders can never push an item below zero. If any item runs short, the decrements
 * already applied are rolled back and a 409 is thrown.
 */
export async function deductStock(items) {
  const need = stockRequirements(items);
  const applied = [];
  for (const [id, qty] of need) {
    const res = await Inventory.updateOne({ _id: id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
    if (res.modifiedCount !== 1) {
      await Promise.all(applied.map(([aid, aqty]) => Inventory.updateOne({ _id: aid }, { $inc: { stock: aqty } })));
      const item = await Inventory.findById(id).lean();
      throw conflict(`Sorry, ${item?.name ?? 'an ingredient'} just ran out of stock`);
    }
    applied.push([id, qty]);
  }
  return Inventory.find({ _id: { $in: [...need.keys()] } });
}
