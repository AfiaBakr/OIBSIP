import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../lib/api';
import { Alert, Field } from '../auth/AuthPages';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password, { admin: true });
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="admin-login">
      <form className="card auth-form" onSubmit={submit} noValidate>
        <p className="auth-emoji">🔐</p>
        <h1>Admin sign in</h1>
        <p className="muted">Staff access to inventory and orders.</p>
        <Alert type="error">{error}</Alert>
        <Field label="Admin email" type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn btn-dark btn-block" disabled={busy || !form.email || !form.password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
