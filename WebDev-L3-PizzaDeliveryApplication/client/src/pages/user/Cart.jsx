import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PizzaArt from '../../components/PizzaArt';
import { useAuth } from '../../context/AuthContext';
import { toOrderPayload, useCart } from '../../context/CartContext';
import { api, errorMessage, rupees } from '../../lib/api';
import { Alert, Field } from '../auth/AuthPages';

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load Razorpay checkout. Check your internet connection.'));
    document.body.appendChild(script);
  });
}

/** Stand-in for Razorpay's test page, used when the server has no Razorpay keys configured. */
function MockCheckout({ amount, onResult }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="mock-title">
      <div className="modal">
        <p className="eyebrow">Test payment</p>
        <h2 id="mock-title">Pay {rupees(amount)}</h2>
        <p className="muted small">
          Razorpay keys are not configured on the server, so this simulated checkout is used instead. Choose how the payment should
          end.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-success" onClick={() => onResult('success')}>
            Success
          </button>
          <button type="button" className="btn btn-danger" onClick={() => onResult('failure')}>
            Failure
          </button>
        </div>
        <button type="button" className="link-btn small" onClick={() => onResult('dismiss')}>
          Cancel payment
        </button>
      </div>
    </div>
  );
}

export default function Cart() {
  const { user, updateUser } = useAuth();
  const { items, subtotal, setQuantity, removeItem, clear } = useCart();
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [address, setAddress] = useState(user.address || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mockOrder, setMockOrder] = useState(null);

  useEffect(() => {
    api.get('/config').then(({ data }) => setConfig(data)).catch(() => {});
  }, []);

  const deliveryFee = config && subtotal < config.freeDeliveryAbove ? config.deliveryFee : 0;
  const total = subtotal + deliveryFee;

  const finishPaid = (order) => {
    clear();
    if (!user.address || !user.phone) updateUser({ ...user, address: user.address || address, phone: user.phone || phone });
    navigate('/orders', { replace: true, state: { placedId: order._id } });
  };

  const verify = async (orderId, body) => {
    try {
      const { data } = await api.post(`/orders/${orderId}/verify`, body);
      finishPaid(data.order);
    } catch (err) {
      setError(errorMessage(err, 'We could not confirm your payment.'));
      setBusy(false);
      // A 409 here means the order was paid but an ingredient ran out; it shows as cancelled in Orders.
      if (err.response?.status === 409) clear();
    }
  };

  const cancel = (orderId, message) => {
    api.post(`/orders/${orderId}/cancel`).catch(() => {});
    setError(message);
    setBusy(false);
  };

  const checkout = async (e) => {
    e.preventDefault();
    setError('');
    if (!address.trim() || !phone.trim()) return setError('Please add a delivery address and phone number.');
    setBusy(true);

    let created;
    try {
      const { data } = await api.post('/orders', { items: items.map(toOrderPayload), deliveryAddress: address, phone });
      created = data;
    } catch (err) {
      setError(errorMessage(err));
      return setBusy(false);
    }

    const { order, payment } = created;
    if (payment.provider === 'mock') {
      setMockOrder(order);
      return;
    }

    try {
      await loadRazorpayScript();
    } catch (err) {
      return cancel(order._id, err.message);
    }

    let paid = false;
    const rzp = new window.Razorpay({
      key: config.razorpayKeyId,
      amount: payment.amount,
      currency: payment.currency,
      order_id: payment.orderId,
      name: 'Pizza Palace',
      description: `Order #${order._id.slice(-6).toUpperCase()}`,
      prefill: { name: user.name, email: user.email, contact: phone },
      theme: { color: '#e8590c' },
      handler: (response) => {
        paid = true;
        verify(order._id, response);
      },
      modal: {
        ondismiss: () => {
          if (!paid) cancel(order._id, 'Payment was cancelled. Your cart is still here whenever you are ready.');
        },
      },
    });
    rzp.on('payment.failed', (resp) => {
      setError(`Payment failed: ${resp.error?.description || 'please try again.'}`);
    });
    rzp.open();
  };

  const onMockResult = (result) => {
    const order = mockOrder;
    setMockOrder(null);
    if (result === 'success') verify(order._id, { mockOutcome: 'success' });
    else cancel(order._id, result === 'failure' ? 'Payment failed. Please try again.' : 'Payment was cancelled.');
  };

  if (items.length === 0) {
    return (
      <div className="empty">
        <p className="auth-emoji">🛒</p>
        <h1>Your cart is empty</h1>
        <p className="muted">Add a pizza from the menu or build your own.</p>
        <div className="row-center">
          <Link to="/" className="btn btn-primary">
            Browse menu
          </Link>
          <Link to="/build" className="btn btn-outline">
            Build your own
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1>Order summary</h1>
      <Alert type="error">{error}</Alert>
      <div className="checkout">
        <section className="stack">
          {items.map((item) => (
            <article key={item.key} className="card cart-line">
              <PizzaArt base={item.base} sauce={item.sauce} cheese={item.cheese} veggies={item.veggies} size={84} />
              <div className="cart-line-body">
                <div className="row-between">
                  <h3>{item.name}</h3>
                  <strong>{rupees(item.unitPrice * item.quantity)}</strong>
                </div>
                <p className="muted small">
                  {item.base.name} · {item.sauce.name} · {item.cheese.name}
                  {item.veggies.length > 0 && ` · ${item.veggies.map((v) => v.name).join(', ')}`}
                </p>
                <div className="row-between">
                  <div className="qty">
                    <button type="button" onClick={() => setQuantity(item.key, item.quantity - 1)} disabled={busy} aria-label="Decrease quantity">
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => setQuantity(item.key, item.quantity + 1)} disabled={busy} aria-label="Increase quantity">
                      +
                    </button>
                  </div>
                  <button type="button" className="link-btn small danger" onClick={() => removeItem(item.key)} disabled={busy}>
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
          <Link to="/" className="small">
            + Add more pizzas
          </Link>
        </section>

        <form className="card checkout-panel" onSubmit={checkout} noValidate>
          <h2>Delivery details</h2>
          <label className="field">
            <span className="field-label">Delivery address</span>
            <textarea className="input" rows={3} required value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <Field label="Phone number" type="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />

          <dl className="totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{rupees(subtotal)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{deliveryFee ? rupees(deliveryFee) : 'Free'}</dd>
            </div>
            <div className="grand">
              <dt>Total</dt>
              <dd>{rupees(total)}</dd>
            </div>
          </dl>
          {config && deliveryFee > 0 && (
            <p className="muted small">Free delivery on orders of {rupees(config.freeDeliveryAbove)} or more.</p>
          )}

          <button className="btn btn-primary btn-block btn-lg" disabled={busy || !config}>
            {busy ? 'Processing…' : `Pay ${rupees(total)}`}
          </button>
          <p className="muted small center">
            {config?.paymentMode === 'razorpay' ? '🔒 Secure payment by Razorpay (test mode)' : '🧪 Test checkout'}
          </p>
        </form>
      </div>

      {mockOrder && <MockCheckout amount={mockOrder.total} onResult={onMockResult} />}
    </>
  );
}
