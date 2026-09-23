const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;
const VIEWS = path.join(__dirname, 'views');

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*\d).{8,}$/; // min 8 characters, at least 1 number

// Compared against when a login name doesn't exist, so a wrong username
// takes about as long as a wrong password and the response gives nothing away.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-0', SALT_ROUNDS);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    // Set SESSION_SECRET in production. The random fallback logs everyone
    // out whenever the server restarts, which is fine for local use.
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    name: 'sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
    },
  })
);

// ---------- Helpers ----------
function isLoggedIn(req) {
  return Boolean(req.session.userId);
}

// Page guard: send visitors without a session back to the login page.
function requireAuthPage(req, res, next) {
  if (!isLoggedIn(req)) return res.redirect('/login');
  // Stop the browser from showing a cached dashboard after logout (Back button).
  res.set('Cache-Control', 'no-store');
  next();
}

// API guard: same check, but answer with JSON instead of a redirect.
function requireAuthApi(req, res, next) {
  if (!isLoggedIn(req)) return res.status(401).json({ error: 'Not logged in.' });
  next();
}

function redirectIfLoggedIn(req, res, next) {
  if (isLoggedIn(req)) return res.redirect('/dashboard');
  next();
}

// Replaces the session ID on login to prevent session fixation.
function startSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

// ---------- Pages ----------
app.get('/', (req, res) => res.redirect(isLoggedIn(req) ? '/dashboard' : '/login'));
app.get('/login', redirectIfLoggedIn, (req, res) => res.sendFile(path.join(VIEWS, 'login.html')));
app.get('/register', redirectIfLoggedIn, (req, res) => res.sendFile(path.join(VIEWS, 'register.html')));
app.get('/dashboard', requireAuthPage, (req, res) => res.sendFile(path.join(VIEWS, 'dashboard.html')));

// ---------- API ----------
app.post('/api/register', async (req, res, next) => {
  try {
    const username = String(req.body.username ?? '').trim();
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    const confirmPassword = String(req.body.confirmPassword ?? '');

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Please fill in all fields.' });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3-20 characters: letters, numbers, or underscores.',
      });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!PASSWORD_RE.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include at least 1 number.',
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const existing = db.findUser(username, email);
    if (existing) {
      const field = existing.username.toLowerCase() === username.toLowerCase() ? 'username' : 'email';
      return res.status(409).json({ error: `An account with this ${field} already exists.` });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = db.createUser(username, email, passwordHash);
    await startSession(req, userId);
    res.status(201).json({ redirect: '/dashboard' });
  } catch (err) {
    next(err);
  }
});

app.post('/api/login', async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier ?? '').trim();
    const password = String(req.body.password ?? '');

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please fill in all fields.' });
    }

    const user = db.findUser(identifier);
    const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

    if (!user || !passwordOk) {
      // Same message either way: never reveal which field was wrong.
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    await startSession(req, user.id);
    res.json({ redirect: '/dashboard' });
  } catch (err) {
    next(err);
  }
});

app.get('/api/me', requireAuthApi, (req, res) => {
  const user = db.findUserById(req.session.userId);
  if (!user) {
    // The account no longer exists; drop the stale session.
    return req.session.destroy(() => res.status(401).json({ error: 'Not logged in.' }));
  }
  res.json({ user });
});

app.post('/api/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('sid');
    res.json({ redirect: '/login' });
  });
});

// ---------- Errors ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
