import { Link, useLocation } from 'react-router-dom';
import OrderCard from '../../components/OrderTracker';
import { isActiveOrder, useMyOrders } from '../../lib/useMyOrders';
import { Alert } from '../auth/AuthPages';

export default function Orders() {
  const { orders, loading, error } = useMyOrders();
  const placedId = useLocation().state?.placedId;
  const active = orders.filter(isActiveOrder);
  const past = orders.filter((o) => !isActiveOrder(o));

  return (
    <>
      <div className="section-head">
        <h1>My orders</h1>
        <span className="muted small">
          <span className="live-dot" aria-hidden="true" /> Updates live
        </span>
      </div>

      {placedId && <Alert type="success">🎉 Payment successful! Your order has been sent to our kitchen.</Alert>}
      <Alert type="error">{error}</Alert>
      {loading && <p className="muted">Loading your orders…</p>}

      {!loading && orders.length === 0 && (
        <div className="empty">
          <p className="auth-emoji">🍕</p>
          <h2>No orders yet</h2>
          <Link to="/" className="btn btn-primary">
            Order your first pizza
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <section className="section">
          <h2>In progress</h2>
          <div className="stack">
            {active.map((o) => (
              <OrderCard key={o._id} order={o} highlight={o._id === placedId} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="section">
          <h2>Past orders</h2>
          <div className="stack">
            {past.map((o) => (
              <OrderCard key={o._id} order={o} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
