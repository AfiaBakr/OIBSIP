import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CART_KEY = 'pp_cart';
const CartContext = createContext(null);

const PENDING_KEY = 'pp_pending_item';
const PENDING_TTL_MS = 2 * 60 * 60 * 1000;

const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Remembers a pizza a guest tried to add, so it can go into their cart once they log in.
 * It's kept in localStorage rather than router state, so it survives the redirects around the
 * login page and even a new user's register → verify-email (new tab) → login detour.
 */
export function savePendingItem(item) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ item: { ...item, pendingId: newKey() }, savedAt: Date.now() }));
  } catch {
    // storage unavailable: the guest just adds the pizza again after logging in
  }
}

/** Returns the saved pizza (if any, and not stale) and forgets it. */
export function takePendingItem() {
  try {
    const saved = JSON.parse(localStorage.getItem(PENDING_KEY));
    localStorage.removeItem(PENDING_KEY);
    if (saved?.item && Date.now() - saved.savedAt < PENDING_TTL_MS) return saved.item;
  } catch {
    // ignore
  }
  return null;
}

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Cart lines: { key, pizzaId?, name, base, sauce, cheese, veggies, unitPrice, quantity }. */
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // Storage full or blocked: the cart still works for this session.
    }
  }, [items]);

  const addItem = useCallback((item) => {
    setItems((prev) => {
      // A pizza picked before logging in carries a pendingId; adding it twice is a no-op.
      if (item.pendingId && prev.some((i) => i.pendingId === item.pendingId)) return prev;
      return [...prev, { ...item, key: newKey(), quantity: item.quantity || 1 }];
    });
  }, []);

  const setQuantity = useCallback((key, quantity) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(10, Math.max(1, quantity)) } : i)));
  }, []);

  const removeItem = useCallback((key) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
    return { items, count, subtotal, addItem, setQuantity, removeItem, clear };
  }, [items, addItem, setQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);

/** Shape the server expects for each cart line. */
export function toOrderPayload(item) {
  if (item.pizzaId) return { pizzaId: item.pizzaId, quantity: item.quantity };
  return {
    base: item.base._id,
    sauce: item.sauce._id,
    cheese: item.cheese._id,
    veggies: item.veggies.map((v) => v._id),
    quantity: item.quantity,
  };
}
