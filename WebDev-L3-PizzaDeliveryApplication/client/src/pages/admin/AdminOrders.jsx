import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '../../components/OrderTracker';
import { api, errorMessage, rupees } from '../../lib/api';
import { useSocket } from '../../lib/useSocket';
import { Alert } from '../auth/AuthPages';

const FLOW = ['Order Received', 'In Kitchen', 'Sent to Delivery', 'Delivered'];
const FILTERS = ['Active', ...FLOW, 'Cancelled', 'All'];
const isActive = (o) => ['Order Received', 'In Kitchen', 'Sent to Delivery'].includes(o.status);

function nextStatus(status) {
  const i = FLOW.indexOf(status);
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
}

function AdminOrderCard({ order, isNew, onUpdated, onError }) {
  const [busy, setBusy] = useState(false);
  const next = nextStatus(order.status);
  const closed = ['Delivered', 'Cancelled'].includes(order.status);

  const setStatus = async (status) => {
    if (status === 'Cancelled' && !window.confirm('Cancel this order? The customer will see it as cancelled.')) return;
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/orders/${order._id}/status`, { status });
      onUpdated(data);
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`card order-card ${isNew ? 'highlight' : ''}`}>
      <header className="order-head">
        <div>
          <h3>
            #{order._id.slice(-6).toUpperCase()} {isNew && <span className="pill">New</span>}
          </h3>
          <p className="muted small">
            {order.user?.name} · {order.user?.email} · {order.phone}
          </p>
          <p className="muted small">{new Date(order.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <ul className="order-lines">
        {order.items.map((item, i) => (
          <li key={i}>
            <span>
              {item.quantity} × <strong>{item.name}</strong>
              <span className="muted small">
                {' '}
                · {item.base.name}, {item.sauce.name}, {item.cheese.name}
                {item.veggies.length > 0 && `, ${item.veggies.map((v) => v.name).join(', ')}`}
              </span>
            </span>
            <span>{rupees(item.unitPrice * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <footer className="order-foot admin-foot">
        <span className="muted small">📍 {order.deliveryAddress}</span>
        <strong>{rupees(order.total)}</strong>
      </footer>

      {order.payment?.status === 'refund_pending' && <Alert type="warning">Payment needs a refund: {order.note}</Alert>}

      {!closed && (
        <div className="order-actions">
          {next && (
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => setStatus(next)}>
              Mark as “{next}”
            </button>
          )}
          <label className="inline-select small">
            Set status
            <select className="input input-sm" value={order.status} disabled={busy} onChange={(e) => setStatus(e.target.value)}>
              {[...FLOW, 'Cancelled'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </article>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('Active');
  const [newIds, setNewIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/orders');
      setOrders(data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upsert = useCallback((order) => {
    setOrders((prev) => (prev.some((o) => o._id === order._id) ? prev.map((o) => (o._id === order._id ? order : o)) : [order, ...prev]));
  }, []);

  useSocket(
    'admin',
    {
      'order:new': (order) => {
        upsert(order);
        setNewIds((prev) => new Set(prev).add(order._id));
      },
      'order:updated': upsert,
    },
    load
  );

  const shown = orders.filter((o) => (filter === 'All' ? true : filter === 'Active' ? isActive(o) : o.status === filter));
  const countFor = (f) => orders.filter((o) => (f === 'All' ? true : f === 'Active' ? isActive(o) : o.status === f)).length;

  return (
    <>
      <div className="section-head">
        <h1>Orders</h1>
        <span className="muted small">
          <span className="live-dot" aria-hidden="true" /> New orders appear automatically
        </span>
      </div>

      <div className="chips" role="group" aria-label="Filter orders">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f} <span className="chip-count">{countFor(f)}</span>
          </button>
        ))}
      </div>

      <Alert type="error">{error}</Alert>
      {loading && <p className="muted">Loading orders…</p>}
      {!loading && shown.length === 0 && <p className="muted empty-inline">No orders here.</p>}

      <div className="stack section">
        {shown.map((o) => (
          <AdminOrderCard
            key={o._id}
            order={o}
            isNew={newIds.has(o._id)}
            onUpdated={(u) => {
              upsert(u);
              setNewIds((prev) => {
                const next = new Set(prev);
                next.delete(u._id);
                return next;
              });
            }}
            onError={setError}
          />
        ))}
      </div>
    </>
  );
}
