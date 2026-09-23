const logoutBtn = document.getElementById('logout-btn');

// Page guard: no valid session means back to the login page.
function loadUser() {
  const user = Store.currentUser();
  if (!user) {
    window.location.replace('index.html');
    return;
  }

  document.getElementById('user-name').textContent = user.username;
  document.getElementById('user-username').textContent = user.username;
  document.getElementById('user-email').textContent = user.email;
  document.getElementById('user-created').textContent = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  document.body.hidden = false;
}

logoutBtn.addEventListener('click', () => {
  Store.endSession();
  // replace() so the Back button doesn't return to the dashboard.
  window.location.replace('index.html');
});

// Re-check the session when the page is restored from the back/forward cache.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) loadUser();
});

loadUser();
