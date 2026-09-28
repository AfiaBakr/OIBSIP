import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OrderCard from '../../components/OrderTracker';
import PizzaArt from '../../components/PizzaArt';
import { useAuth } from '../../context/AuthContext';
import { savePendingItem, useCart } from '../../context/CartContext';
import { api, errorMessage, rupees } from '../../lib/api';
import { isActiveOrder, useMyOrders } from '../../lib/useMyOrders';
import { Alert } from '../auth/AuthPages';

const TAG_LABELS = { veg: '🌱 Veggie', classic: '⭐ Classic', spicy: '🌶️ Spicy', premium: '👑 Premium' };

/** The customer's orders in progress, updated live. Only rendered for logged-in customers. */
function LiveOrders() {
  const { orders } = useMyOrders();
  const active = orders.filter(isActiveOrder);
  if (active.length === 0) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2>
          Live order status <span className="live-dot" aria-hidden="true" />
        </h2>
        <Link to="/orders" className="small">
          All orders →
        </Link>
      </div>
      <div className="stack">
        {active.map((o) => (
          <OrderCard key={o._id} order={o} />
        ))}
      </div>
    </section>
  );
}

// Public home page: anyone can browse the menu; adding to cart asks guests to log in first.
export default function Dashboard() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [pizzas, setPizzas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api
      .get('/pizzas')
      .then(({ data }) => setPizzas(data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!added) return undefined;
    const t = setTimeout(() => setAdded(''), 2500);
    return () => clearTimeout(t);
  }, [added]);

  const shown = filter === 'all' ? pizzas : pizzas.filter((p) => p.tag === filter);

  const addToCart = (p) => {
    const item = { pizzaId: p._id, name: p.name, base: p.base, sauce: p.sauce, cheese: p.cheese, veggies: p.veggies, unitPrice: p.price };
    if (!user) {
      // Remember the pizza: it's added to the cart right after they log in.
      savePendingItem(item);
      navigate('/login', { state: { from: '/cart', message: 'Please log in to add pizzas to your cart.' } });
      return;
    }
    addItem(item);
    setAdded(p.name);
  };

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">{user ? `Hello, ${user.name.split(' ')[0]} 👋` : 'Welcome to Pizza Palace 👋'}</p>
          <h1>What are we baking today?</h1>
          <p className="muted">Pick one of our favourites or build a pizza that's entirely yours.</p>
        </div>
        <Link to="/build" className="btn btn-primary btn-lg">
          🛠️ Build your own pizza
        </Link>
      </section>

      {user && <LiveOrders />}

      <section className="section">
        <div className="section-head">
          <h2>Our pizzas</h2>
          <div className="chips" role="group" aria-label="Filter pizzas">
            {['all', 'classic', 'veg', 'spicy', 'premium'].map((t) => (
              <button key={t} type="button" className={`chip ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
                {t === 'all' ? 'All' : TAG_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <Alert type="error">{error}</Alert>
        {loading && <p className="muted">Loading the menu…</p>}

        <div className="grid">
          {shown.map((p) => (
            <article key={p._id} className="card pizza-card">
              <div className="pizza-card-art">
                <PizzaArt base={p.base} sauce={p.sauce} cheese={p.cheese} veggies={p.veggies} size={150} />
                <span className="tag">{TAG_LABELS[p.tag]}</span>
              </div>
              <div className="pizza-card-body">
                <div className="row-between">
                  <h3>{p.name}</h3>
                  <strong className="price">{rupees(p.price)}</strong>
                </div>
                <p className="muted small">{p.description}</p>
                <p className="ingredients small">
                  {[p.base, p.sauce, p.cheese, ...p.veggies].map((i) => i.name).join(' · ')}
                </p>
              </div>
              <div className="pizza-card-actions">
                {p.available ? (
                  <>
                    <button type="button" className="btn btn-primary" onClick={() => addToCart(p)}>
                      Add to cart
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => navigate('/build', { state: { preset: p } })}>
                      Customise
                    </button>
                  </>
                ) : (
                  <span className="badge badge-cancelled">Sold out for now</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {added && (
        <div className="toast" role="status">
          ✓ {added} added to your cart. <Link to="/cart">View cart</Link>
        </div>
      )}
    </>
  );
}
