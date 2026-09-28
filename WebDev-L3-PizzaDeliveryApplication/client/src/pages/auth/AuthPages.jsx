import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';

export function Field({ label, hint, ...props }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className="input" {...props} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Alert({ type = 'info', children }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

const passwordProblem = (pw) =>
  pw.length < 8 || !/\d/.test(pw) || !/[A-Za-z]/.test(pw) ? 'Use at least 8 characters with letters and numbers.' : '';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState(location.state?.message || '');
  const [unverified, setUnverified] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    setUnverified(false);
    try {
      await login(form.email, form.password);
      // A pizza saved before login is added by the store layout, which then opens the cart.
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setUnverified(err.response?.data?.code === 'EMAIL_NOT_VERIFIED');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      const { data } = await api.post('/auth/resend-verification', { email: form.email });
      setError('');
      setUnverified(false);
      setInfo(data.message);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h1>Welcome back</h1>
      <p className="muted">Log in to order and track your pizzas.</p>
      <Alert type="success">{info}</Alert>
      <Alert type="error">
        {error}
        {unverified && (
          <>
            {' '}
            <button type="button" className="link-btn" onClick={resend}>
              Resend verification email
            </button>
          </>
        )}
      </Alert>
      <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Field label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <div className="row-between">
        <span />
        <Link to="/forgot-password" className="small">
          Forgot password?
        </Link>
      </div>
      <button className="btn btn-primary btn-block" disabled={busy || !form.email || !form.password}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>
      <p className="center muted">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </form>
  );
}

export function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const problem = passwordProblem(form.password) || (form.password !== form.confirm ? 'Passwords do not match.' : '');
    if (problem) return setError(problem);
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', { name: form.name, email: form.email, password: form.password });
      setDone(data.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="auth-form">
        <p className="auth-emoji">📬</p>
        <h1>Check your inbox</h1>
        <p className="muted">
          {done} (<strong>{form.email}</strong>)
        </p>
        <Link to="/login" className="btn btn-primary btn-block">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h1>Create your account</h1>
      <p className="muted">It only takes a minute.</p>
      <Alert type="error">{error}</Alert>
      <Field label="Full name" autoComplete="name" required value={form.name} onChange={set('name')} />
      <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        value={form.password}
        onChange={set('password')}
        hint="At least 8 characters, with letters and numbers."
      />
      <Field label="Confirm password" type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
      <button className="btn btn-primary btn-block" disabled={busy || !form.name || !form.email || !form.password}>
        {busy ? 'Creating account…' : 'Create account'}
      </button>
      <p className="center muted">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}

export function VerifyEmail() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading', message: '' });
  const started = useRef(false);

  useEffect(() => {
    // The token is single-use, so guard against React StrictMode running this effect twice.
    if (started.current) return;
    started.current = true;
    api
      .get(`/auth/verify-email/${token}`)
      .then(({ data }) => setState({ status: 'ok', message: data.message }))
      .catch((err) => setState({ status: 'error', message: errorMessage(err) }));
  }, [token]);

  return (
    <div className="auth-form">
      <p className="auth-emoji">{state.status === 'loading' ? '⏳' : state.status === 'ok' ? '✅' : '⚠️'}</p>
      <h1>{state.status === 'loading' ? 'Verifying…' : state.status === 'ok' ? 'Email verified' : 'Verification failed'}</h1>
      <p className="muted">{state.message}</p>
      {state.status !== 'loading' && (
        <Link to="/login" className="btn btn-primary btn-block">
          Go to login
        </Link>
      )}
    </div>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h1>Forgot your password?</h1>
      <p className="muted">Enter your email and we will send you a link to reset it.</p>
      <Alert type="success">{message}</Alert>
      <Alert type="error">{error}</Alert>
      <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="btn btn-primary btn-block" disabled={busy || !email}>
        {busy ? 'Sending…' : 'Send reset link'}
      </button>
      <p className="center muted">
        <Link to="/login">Back to login</Link>
      </p>
    </form>
  );
}

export function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const problem = passwordProblem(form.password) || (form.password !== form.confirm ? 'Passwords do not match.' : '');
    if (problem) return setError(problem);
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, { password: form.password });
      navigate('/login', { replace: true, state: { message: data.message } });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h1>Choose a new password</h1>
      <Alert type="error">{error}</Alert>
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        hint="At least 8 characters, with letters and numbers."
      />
      <Field label="Confirm password" type="password" autoComplete="new-password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
      <button className="btn btn-primary btn-block" disabled={busy || !form.password}>
        {busy ? 'Saving…' : 'Update password'}
      </button>
    </form>
  );
}
