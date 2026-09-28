import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage, rupees } from '../../lib/api';
import { useSocket } from '../../lib/useSocket';
import { Alert } from '../auth/AuthPages';

const CATEGORY_TITLES = { base: '🫓 Pizza bases', sauce: '🥫 Sauces', cheese: '🧀 Cheeses', veggie: '🥦 Vegetables' };

function StockRow({ item, onSaved, onError }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ stock: item.stock, threshold: item.threshold, price: item.price });
  const [busy, setBusy] = useState(false);

  const save = async (body) => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/inventory/${item._id}`, body);
      onSaved(data);
      setEditing(false);
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = () => {
    setDraft({ stock: item.stock, threshold: item.threshold, price: item.price });
    setEditing(true);
  };

  const pct = Math.min(100, Math.round((item.stock / Math.max(item.threshold * 3, 1)) * 100));

  return (
    <tr className={item.isLow ? 'row-low' : ''}>
      <td>
        <strong>{item.name}</strong>
      </td>
      <td>
        {editing ? (
          <input className="input input-sm" type="number" min="0" step="1" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} aria-label={`${item.name} price`} />
        ) : (
          rupees(item.price)
        )}
      </td>
      <td>
        {editing ? (
          <input className="input input-sm" type="number" min="0" step="1" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} aria-label={`${item.name} stock`} />
        ) : (
          <div className="stock-cell">
            <span className="stock-num">{item.stock}</span>
            <span className="meter" aria-hidden="true">
              <span className={item.isLow ? 'low' : ''} style={{ width: `${pct}%` }} />
            </span>
          </div>
        )}
      </td>
      <td>
        {editing ? (
          <input className="input input-sm" type="number" min="0" step="1" value={draft.threshold} onChange={(e) => setDraft({ ...draft, threshold: e.target.value })} aria-label={`${item.name} threshold`} />
        ) : (
          item.threshold
        )}
      </td>
      <td>{item.isLow ? <span className="badge badge-cancelled">Low stock</span> : <span className="badge badge-delivered">OK</span>}</td>
      <td className="actions">
        {editing ? (
          <>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => save({ stock: Number(draft.stock), threshold: Number(draft.threshold), price: Number(draft.price) })}
            >
              Save
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => save({ adjust: 10 })} disabled={busy} title="Add 10 units">
              +10
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => save({ adjust: 50 })} disabled={busy} title="Add 50 units">
              +50
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={startEdit}>
              Edit
            </button>
          </>
        )}
      </td>
    </tr>
  );
}

function AddItemForm({ onCreated, onError }) {
  const [open, setOpen] = useState(false);
  const empty = { category: 'veggie', name: '', description: '', price: '', stock: '', threshold: '' };
  const [form, setForm] = useState(empty);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...form, price: Number(form.price), stock: Number(form.stock || 0) };
      if (form.threshold === '') delete body.threshold;
      else body.threshold = Number(form.threshold);
      const { data } = await api.post('/admin/inventory', body);
      onCreated(data);
      setForm(empty);
      setOpen(false);
    } catch (err) {
      onError(errorMessage(err));
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>
        + Add inventory item
      </button>
    );
  }

  return (
    <form className="card add-form" onSubmit={submit}>
      <h3>New inventory item</h3>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">Category</span>
          <select className="input" value={form.category} onChange={set('category')}>
            {Object.keys(CATEGORY_TITLES).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Name</span>
          <input className="input" required value={form.name} onChange={set('name')} />
        </label>
        <label className="field">
          <span className="field-label">Price (Rs)</span>
          <input className="input" type="number" min="0" required value={form.price} onChange={set('price')} />
        </label>
        <label className="field">
          <span className="field-label">Opening stock</span>
          <input className="input" type="number" min="0" value={form.stock} onChange={set('stock')} />
        </label>
        <label className="field">
          <span className="field-label">Alert threshold</span>
          <input className="input" type="number" min="0" placeholder="Default" value={form.threshold} onChange={set('threshold')} />
        </label>
        <label className="field">
          <span className="field-label">Description</span>
          <input className="input" value={form.description} onChange={set('description')} />
        </label>
      </div>
      <div className="row-end">
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button className="btn btn-primary">Add item</button>
      </div>
    </form>
  );
}

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    try {
      const [inv, st] = await Promise.all([api.get('/admin/inventory'), api.get('/admin/stats')]);
      setItems(inv.data);
      setStats(st.data);
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

  const merge = useCallback((updated) => {
    setItems((prev) => {
      const byId = new Map(prev.map((i) => [i._id, i]));
      for (const u of updated) byId.set(u._id, u);
      return [...byId.values()];
    });
  }, []);

  const refreshStats = useCallback(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  useSocket(
    'admin',
    {
      'inventory:updated': (updated) => {
        merge(updated);
        refreshStats();
      },
      'order:new': refreshStats,
      'order:updated': refreshStats,
    },
    load
  );

  const runCheck = async () => {
    setInfo('');
    try {
      const { data } = await api.post('/admin/inventory/check-low-stock');
      setInfo(
        data.alerted.length
          ? `Low-stock email sent for: ${data.alerted.join(', ')}.`
          : 'No new low-stock items. Items already reported are not emailed again until they are restocked.'
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const lowItems = items.filter((i) => i.isLow);
  const activeOrders = stats ? ['Order Received', 'In Kitchen', 'Sent to Delivery'].reduce((n, s) => n + (stats.byStatus[s] || 0), 0) : 0;

  return (
    <>
      <div className="section-head">
        <h1>Inventory</h1>
        <button type="button" className="btn btn-outline btn-sm" onClick={runCheck}>
          📧 Run low-stock check now
        </button>
      </div>

      {stats && (
        <div className="stats">
          <div className="card stat">
            <span className="stat-label">Orders today</span>
            <span className="stat-value">{stats.todayOrders}</span>
          </div>
          <div className="card stat">
            <span className="stat-label">Revenue today</span>
            <span className="stat-value">{rupees(stats.todayRevenue)}</span>
          </div>
          <div className="card stat">
            <span className="stat-label">Active orders</span>
            <span className="stat-value">{activeOrders}</span>
          </div>
          <div className={`card stat ${stats.lowStock ? 'stat-alert' : ''}`}>
            <span className="stat-label">Low-stock items</span>
            <span className="stat-value">{stats.lowStock}</span>
          </div>
        </div>
      )}

      <Alert type="error">{error}</Alert>
      <Alert type="info">{info}</Alert>
      {lowItems.length > 0 && (
        <Alert type="warning">
          ⚠️ Running low on <strong>{lowItems.map((i) => `${i.name} (${i.stock})`).join(', ')}</strong>. An email alert is sent to the admin
          automatically by the scheduled stock check.
        </Alert>
      )}
      {loading && <p className="muted">Loading inventory…</p>}

      {Object.entries(CATEGORY_TITLES).map(([category, title]) => {
        const rows = items.filter((i) => i.category === category).sort((a, b) => a.name.localeCompare(b.name));
        if (!rows.length) return null;
        return (
          <section key={category} className="section">
            <h2>{title}</h2>
            <div className="card table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Price</th>
                    <th>In stock</th>
                    <th>Threshold</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <StockRow key={item._id} item={item} onSaved={(u) => merge([u])} onError={setError} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <section className="section">
        <AddItemForm onCreated={(i) => merge([i])} onError={setError} />
      </section>
    </>
  );
}
