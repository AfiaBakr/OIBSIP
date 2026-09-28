import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PizzaArt from '../../components/PizzaArt';
import { useAuth } from '../../context/AuthContext';
import { savePendingItem, useCart } from '../../context/CartContext';
import { api, errorMessage, rupees } from '../../lib/api';
import { Alert } from '../auth/AuthPages';

const MAX_VEGGIES = 8;

const STEPS = [
  { key: 'base', title: 'Choose your base', short: 'Base', multi: false },
  { key: 'sauce', title: 'Pick a sauce', short: 'Sauce', multi: false },
  { key: 'cheese', title: 'Choose your cheese', short: 'Cheese', multi: false },
  { key: 'veggie', title: 'Add vegetables', short: 'Veggies', multi: true },
];

export default function Builder() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const preset = useLocation().state?.preset;

  const [options, setOptions] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [pick, setPick] = useState({
    base: preset?.base ?? null,
    sauce: preset?.sauce ?? null,
    cheese: preset?.cheese ?? null,
    veggie: preset?.veggies ?? [],
  });

  useEffect(() => {
    api
      .get('/ingredients')
      .then(({ data }) => setOptions(data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const price = useMemo(
    () => [pick.base, pick.sauce, pick.cheese, ...pick.veggie].reduce((sum, i) => sum + (i?.price || 0), 0),
    [pick]
  );

  const reviewing = step === STEPS.length;
  const current = STEPS[step];
  const stepDone = (i) => (STEPS[i].multi ? true : Boolean(pick[STEPS[i].key]));
  const canContinue = reviewing || stepDone(step);
  const ready = STEPS.every((_, i) => stepDone(i));

  const choose = (item) => {
    if (!item.available) return;
    if (!current.multi) {
      setPick((p) => ({ ...p, [current.key]: item }));
      return;
    }
    setPick((p) => {
      const has = p.veggie.some((v) => v._id === item._id);
      if (!has && p.veggie.length >= MAX_VEGGIES) return p;
      return { ...p, veggie: has ? p.veggie.filter((v) => v._id !== item._id) : [...p.veggie, item] };
    });
  };

  const isSelected = (item) =>
    current.multi ? pick.veggie.some((v) => v._id === item._id) : pick[current.key]?._id === item._id;

  const addToCart = () => {
    const item = { name: 'Custom Pizza', base: pick.base, sauce: pick.sauce, cheese: pick.cheese, veggies: pick.veggie, unitPrice: price, quantity };
    if (!user) {
      // Keep the pizza they built: it's added to the cart right after they log in.
      savePendingItem(item);
      navigate('/login', { state: { from: '/cart', message: 'Please log in to add your pizza to the cart.' } });
      return;
    }
    addItem(item);
    navigate('/cart');
  };

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Build your own pizza</h1>
          {preset && <p className="muted">Starting from our {preset.name}. Change anything you like.</p>}
        </div>
      </div>

      <ol className="stepper">
        {[...STEPS, { short: 'Review' }].map((s, i) => (
          <li key={s.short} className={i === step ? 'current' : i < step ? 'done' : ''}>
            <button
              type="button"
              onClick={() => setStep(i)}
              disabled={i > step && !STEPS.slice(0, i).every((_, j) => stepDone(j))}
            >
              <span className="step-num">{i < step ? '✓' : i + 1}</span>
              <span className="step-label">{s.short}</span>
            </button>
          </li>
        ))}
      </ol>

      <Alert type="error">{error}</Alert>

      <div className="builder">
        <section className="builder-main">
          {!options && !error && <p className="muted">Loading ingredients…</p>}

          {options && !reviewing && (
            <>
              <div className="row-between">
                <h2>
                  Step {step + 1}: {current.title}
                </h2>
                {current.multi && (
                  <span className="muted small">
                    {pick.veggie.length}/{MAX_VEGGIES} selected (optional)
                  </span>
                )}
              </div>
              {options[current.key].length === 0 && (
                <Alert type="warning">No options are available for this step yet. Please check back soon.</Alert>
              )}
              <div className="option-grid">
                {options[current.key].map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    className={`option ${isSelected(item) ? 'selected' : ''}`}
                    onClick={() => choose(item)}
                    disabled={!item.available}
                    aria-pressed={isSelected(item)}
                  >
                    <span className="option-check" aria-hidden="true">
                      {isSelected(item) ? '✓' : ''}
                    </span>
                    <span className="option-name">{item.name}</span>
                    {item.description && <span className="option-desc">{item.description}</span>}
                    <span className="option-price">{item.available ? `+ ${rupees(item.price)}` : 'Out of stock'}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {options && reviewing && (
            <div className="review">
              <h2>Review your pizza</h2>
              <dl className="summary-list">
                {STEPS.map((s, i) => (
                  <div key={s.key}>
                    <dt>{s.short}</dt>
                    <dd>
                      {s.multi
                        ? pick.veggie.length
                          ? pick.veggie.map((v) => v.name).join(', ')
                          : 'No vegetables'
                        : pick[s.key]?.name}
                      <button type="button" className="link-btn small" onClick={() => setStep(i)}>
                        Change
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="qty-row">
                <span>Quantity</span>
                <div className="qty">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                    −
                  </button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => setQuantity((q) => Math.min(10, q + 1))} aria-label="Increase quantity">
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="builder-nav">
            <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              ← Back
            </button>
            {reviewing ? (
              <button type="button" className="btn btn-primary" onClick={addToCart} disabled={!ready}>
                Add to cart · {rupees(price * quantity)}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                {step === STEPS.length - 1 ? 'Review pizza →' : 'Next →'}
              </button>
            )}
          </div>
        </section>

        <aside className="card builder-preview">
          <PizzaArt base={pick.base} sauce={pick.sauce} cheese={pick.cheese} veggies={pick.veggie} size={220} />
          <ul className="preview-lines small">
            <li>
              <span>Base</span>
              <span>{pick.base ? `${pick.base.name} · ${rupees(pick.base.price)}` : '—'}</span>
            </li>
            <li>
              <span>Sauce</span>
              <span>{pick.sauce ? `${pick.sauce.name} · ${rupees(pick.sauce.price)}` : '—'}</span>
            </li>
            <li>
              <span>Cheese</span>
              <span>{pick.cheese ? `${pick.cheese.name} · ${rupees(pick.cheese.price)}` : '—'}</span>
            </li>
            <li>
              <span>Veggies</span>
              <span>{pick.veggie.length ? pick.veggie.map((v) => v.name).join(', ') : '—'}</span>
            </li>
          </ul>
          <div className="row-between preview-total">
            <span>Price per pizza</span>
            <strong>{rupees(price)}</strong>
          </div>
        </aside>
      </div>
    </>
  );
}
