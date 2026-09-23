const logoutBtn = document.getElementById('logout-btn');

async function loadUser() {
  const res = await fetch('/api/me');
  if (res.status === 401) {
    window.location.href = '/login';
    return;
  }
  const { user } = await res.json();

  document.getElementById('user-name').textContent = user.username;
  document.getElementById('user-username').textContent = user.username;
  document.getElementById('user-email').textContent = user.email;
  // SQLite stores UTC as "YYYY-MM-DD HH:MM:SS"; convert it to a local date.
  const created = new Date(user.created_at.replace(' ', 'T') + 'Z');
  document.getElementById('user-created').textContent = created.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

logoutBtn.addEventListener('click', async () => {
  logoutBtn.disabled = true;
  try {
    await fetch('/api/logout', { method: 'POST' });
  } finally {
    // replace() so the Back button doesn't return to the dashboard.
    window.location.replace('/login');
  }
});

// Re-check the session when the page is restored from the back/forward cache.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) loadUser();
});

loadUser();
