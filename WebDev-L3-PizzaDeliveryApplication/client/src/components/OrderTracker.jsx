import { rupees } from '../lib/api';

export const TRACK_STEPS = ['Order Received', 'In Kitchen', 'Sent to Delivery', 'Delivered'];

const STEP_ICONS = { 'Order Received': '🧾', 'In Kitchen': '👨‍🍳', 'Sent to Delivery': '🛵', Delivered: '🏠' };

const formatTime = (d) => new Date(d).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span>;
}

export function StatusSteps({ order }) {
  const current = TRACK_STEPS.indexOf(order.status);
  const timeFor = (step) => order.statusHistory?.findLast?.((h) => h.status === step)?.at;
  return (
    <ol className="tracker" aria-label="Order progress">
      {TRACK_STEPS.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        const at = timeFor(step);
        return (
          <li key={step} className={`tracker-step ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="tracker-dot">{state === 'done' ? '✓' : STEP_ICONS[step]}</span>
            <span className="tracker-label">{step}</span>
            {at && state !== 'todo' && (
              <span className="tracker-time">{new Date(at).toLocaleTimeString('en-PK', { timeStyle: 'short' })}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderCard({ order, highlight = false }) {
  const cancelled = order.status === 'Cancelled';
  return (
    <article className={`card order-card ${highlight ? 'highlight' : ''}`}>
      <header className="order-head">
        <div>
          <h3>Order #{order._id.slice(-6).toUpperCase()}</h3>
          <p className="muted small">{formatTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      {cancelled ? (
        <p className="alert alert-error">
          This order was cancelled.
          {order.payment?.status === 'refund_pending' && ' Your payment will be refunded.'}
          {order.note && ` ${order.note}.`}
        </p>
      ) : (
        <StatusSteps order={order} />
      )}

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
      <footer className="order-foot">
        <span className="muted small">Deliver to: {order.deliveryAddress}</span>
        <strong>Total {rupees(order.total)}</strong>
      </footer>
    </article>
  );
}
