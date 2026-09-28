import axios from 'axios';

// Customer and admin sessions are stored separately, so one browser can be logged in as both
// (e.g. place an order as a customer in one tab and manage it as admin in another).
const AUTH_KEYS = { user: 'pp_auth_user', admin: 'pp_auth_admin' };

try {
  localStorage.removeItem('pp_auth'); // single-session key used by earlier versions
} catch {
  // storage unavailable
}

export function loadAuth(kind) {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEYS[kind])) || null;
  } catch {
    return null;
  }
}

export function saveAuth(kind, auth) {
  try {
    if (auth) localStorage.setItem(AUTH_KEYS[kind], JSON.stringify(auth));
    else localStorage.removeItem(AUTH_KEYS[kind]);
  } catch {
    // storage unavailable: the session lasts until the page is reloaded
  }
}

/** Admin API calls carry the admin token; everything else carries the customer token. */
const kindForUrl = (url = '') => (url.startsWith('/admin') ? 'admin' : 'user');

// Empty in development (Vite proxies /api). In production, set VITE_API_URL to the API's origin,
// e.g. https://pizza-api.onrender.com, when the client and API are hosted separately.
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use((config) => {
  const token = loadAuth(kindForUrl(config.url))?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Lets AuthContext log out the matching session when a request comes back 401.
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const kind = kindForUrl(err.config?.url);
    if (err.response?.status === 401 && err.config?.headers?.Authorization && loadAuth(kind)) onUnauthorized(kind);
    return Promise.reject(err);
  }
);

export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request && !err.response) return 'Cannot reach the server. Is it running?';
  return fallback;
}

export const rupees = (n) => `Rs ${Number(n).toLocaleString('en-PK')}`;
