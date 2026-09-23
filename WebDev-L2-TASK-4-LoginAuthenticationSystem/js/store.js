// Browser-only "backend": users live in localStorage, the login session in
// sessionStorage. Loaded by every page before its own script.
const USERS_KEY = 'auth.users';
const SESSION_KEY = 'auth.session';
const SESSION_MS = 1000 * 60 * 60 * 2; // 2 hours
const PBKDF2_ITERATIONS = 100000;

const Store = (() => {
  // ---------- Encoding helpers ----------
  const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const fromHex = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));

  // ---------- Password hashing ----------
  // PBKDF2-SHA256 with a random salt per user, so plain-text passwords are
  // never stored and two users with the same password get different hashes.
  async function derive(password, salt) {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
      key,
      256
    );
    return toHex(new Uint8Array(bits));
  }

  async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return { salt: toHex(salt), hash: await derive(password, salt) };
  }

  async function verifyPassword(password, user) {
    return (await derive(password, fromHex(user.salt))) === user.hash;
  }

  // ---------- Users ----------
  function loadUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // Matches either username or email, ignoring case ("Afia" == "afia").
  function findUser(username, email = username) {
    const u = username.toLowerCase();
    const e = email.toLowerCase();
    return loadUsers().find((user) => user.username.toLowerCase() === u || user.email === e);
  }

  function findUserById(id) {
    return loadUsers().find((user) => user.id === id);
  }

  async function createUser(username, email, password) {
    const users = loadUsers();
    const { salt, hash } = await hashPassword(password);
    const user = {
      id: crypto.randomUUID(),
      username,
      email,
      salt,
      hash,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
    return user;
  }

  // ---------- Session ----------
  function startSession(userId) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, expires: Date.now() + SESSION_MS }));
  }

  function endSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // Returns the logged-in user, or null if there is no valid session.
  function currentUser() {
    let session;
    try {
      session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch {
      session = null;
    }
    if (!session || session.expires < Date.now()) {
      endSession();
      return null;
    }
    const user = findUserById(session.userId);
    if (!user) endSession(); // account no longer exists
    return user || null;
  }

  return { findUser, createUser, verifyPassword, startSession, endSession, currentUser };
})();
