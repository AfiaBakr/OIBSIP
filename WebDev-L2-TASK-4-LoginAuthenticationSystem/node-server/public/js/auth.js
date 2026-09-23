// Shared script for the login and register pages.
const form = document.querySelector('form[data-endpoint]');
const alertBox = document.getElementById('form-alert');
const submitBtn = form.querySelector('button[type="submit"]');
const isRegister = form.id === 'register-form';

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- UI helpers ----------
function showAlert(message) {
  alertBox.textContent = message;
  alertBox.hidden = false;
}

function hideAlert() {
  alertBox.hidden = true;
  alertBox.textContent = '';
}

function setFieldError(name, message) {
  const input = form.elements[name];
  const errorEl = document.getElementById(`${name}-error`);
  input.classList.toggle('invalid', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (errorEl) errorEl.textContent = message || '';
}

function clearErrors() {
  for (const input of form.querySelectorAll('input')) setFieldError(input.name, '');
}

// ---------- Validation ----------
function passwordChecks(password) {
  return {
    length: password.length >= 8,
    number: /\d/.test(password),
  };
}

function validate(values) {
  const errors = {};

  // No empty submissions on either page.
  for (const [name, value] of Object.entries(values)) {
    if (!value.trim()) errors[name] = 'This field is required.';
  }

  if (isRegister) {
    if (!errors.username && !USERNAME_RE.test(values.username.trim())) {
      errors.username = '3-20 characters: letters, numbers, or underscores.';
    }
    if (!errors.email && !EMAIL_RE.test(values.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!errors.password) {
      const checks = passwordChecks(values.password);
      if (!checks.length || !checks.number) {
        errors.password = 'Password must be at least 8 characters and include at least 1 number.';
      }
    }
    if (!errors.confirmPassword && values.confirmPassword !== values.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }
  }

  return errors;
}

// ---------- Live password rules (register page) ----------
if (isRegister) {
  const rules = document.getElementById('password-rules');
  form.elements.password.addEventListener('input', (e) => {
    const checks = passwordChecks(e.target.value);
    for (const li of rules.querySelectorAll('li')) {
      li.classList.toggle('met', checks[li.dataset.rule]);
    }
  });
}

// ---------- Show / hide password ----------
for (const btn of document.querySelectorAll('.toggle-password')) {
  btn.addEventListener('click', () => {
    const input = btn.previousElementSibling;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Hide' : 'Show';
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
}

// Clear a field's error as soon as the user edits it.
form.addEventListener('input', (e) => {
  if (e.target.name) setFieldError(e.target.name, '');
  hideAlert();
});

// ---------- Submit ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();
  clearErrors();

  const values = Object.fromEntries(new FormData(form));
  const errors = validate(values);
  const invalidFields = Object.keys(errors);

  if (invalidFields.length) {
    for (const name of invalidFields) setFieldError(name, errors[name]);
    form.elements[invalidFields[0]].focus();
    return;
  }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = 'Please wait…';

  try {
    const res = await fetch(form.dataset.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.redirect) {
      window.location.href = data.redirect;
      return;
    }
    showAlert(data.error || 'Something went wrong. Please try again.');
  } catch {
    showAlert('Could not reach the server. Please check your connection.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});
