import { useEffect } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { takePendingItem, useCart } from '../context/CartContext';

function Brand({ to }) {
  return (
    <Link to={to} className="brand">
      <span aria-hidden="true">🍕</span> Pizza Palace
    </Link>
  );
}

/** Store layout. Works for guests (menu and builder are public) and logged-in customers. */
export function UserLayout() {
  const { user, logout } = useAuth();
  const { count, clear, addItem } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  // A guest who clicked "Add to cart" had that pizza saved. As soon as they are logged in
  // (whichever page the login flow drops them on), put it in the cart and show the cart.
  useEffect(() => {
    if (!user) return;
    const pending = takePendingItem();
    if (!pending) return;
    addItem(pending);
    navigate('/cart', { replace: true });
  }, [user, addItem, navigate]);

  return (
    <>
      <header className="navbar">
        <div className="container nav-inner">
          <Brand to="/" />
          <nav className="nav-links">
            <NavLink to="/" end>
              Menu
            </NavLink>
            <NavLink to="/build">Build your own</NavLink>
            {user && <NavLink to="/orders">My orders</NavLink>}
            {user && (
              <NavLink to="/cart" className="cart-link">
                Cart {count > 0 && <span className="pill">{count}</span>}
              </NavLink>
            )}
          </nav>
          <div className="nav-user">
            {user ? (
              <>
                <span className="muted small hide-sm">Hi, {user.name.split(' ')[0]}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    logout('user', { manual: true });
                    clear();
                    navigate('/', { replace: true });
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" state={{ from: location.pathname }} className="btn btn-ghost btn-sm">
                  Log in
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container page">
        <Outlet />
      </main>
    </>
  );
}

export function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <header className="navbar navbar-admin">
        <div className="container nav-inner">
          <Brand to="/admin" />
          <span className="pill pill-dark">Admin</span>
          <nav className="nav-links">
            <NavLink to="/admin" end>
              Inventory
            </NavLink>
            <NavLink to="/admin/orders">Orders</NavLink>
          </nav>
          <div className="nav-user">
            <span className="muted small hide-sm">{admin.email}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                logout('admin');
                navigate('/admin/login');
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="container page">
        <Outlet />
      </main>
    </>
  );
}

export function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-art" aria-hidden="true">
        <div>
          <p className="auth-emoji">🍕</p>
          <h2>Hot, fresh and made your way.</h2>
          <p>Pick a favourite or build your own pizza, then follow it from our kitchen to your door.</p>
        </div>
      </div>
      <main className="auth-panel">
        <div className="auth-form">
          <Link to="/" className="small back-link">
            ← Back to menu
          </Link>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

/** Requires a customer session; guests go to the login page and come back afterwards. */
export function RequireUser({ children }) {
  const { user, userLoggedOut } = useAuth();
  const location = useLocation();
  // Someone who just clicked "Log out" goes to the home page, not the login page.
  if (!user && userLoggedOut) return <Navigate to="/" replace />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

/** Requires an admin session. Independent of any customer session in the same browser. */
export function RequireAdmin({ children }) {
  const { admin } = useAuth();
  const location = useLocation();
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}

/** Sends visitors who already have the matching session away from its login pages. */
export function RedirectIfAuthed({ kind = 'user', children }) {
  const auth = useAuth();
  const from = useLocation().state?.from;
  // Honour `from` so this redirect and the login page's own redirect agree on where to go.
  if (kind === 'admin' && auth.admin) return <Navigate to={from || '/admin'} replace />;
  if (kind === 'user' && auth.user) return <Navigate to={from || '/'} replace />;
  return children;
}
