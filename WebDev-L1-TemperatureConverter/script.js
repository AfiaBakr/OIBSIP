const form = document.getElementById('converterForm');
const valueInput = document.getElementById('tempValue');
const valueError = document.getElementById('valueError');
const unitOptions = document.getElementById('unitOptions');

const outC = document.getElementById('out-C');
const outF = document.getElementById('out-F');
const outK = document.getElementById('out-K');
const rowC = document.getElementById('row-C');
const rowF = document.getElementById('row-F');
const rowK = document.getElementById('row-K');

const ABSOLUTE_ZERO_C = -273.15;

// ---------- Conversion helpers ----------
function celsiusToFahrenheit(c) {
  return (c * 9) / 5 + 32;
}

function celsiusToKelvin(c) {
  return c + 273.15;
}

function toCelsius(value, unit) {
  if (unit === 'C') return value;
  if (unit === 'F') return ((value - 32) * 5) / 9;
  if (unit === 'K') return value - 273.15;
}

function formatTemp(num) {
  return `${Math.round(num * 100) / 100}`;
}

// ---------- Validation ----------
function clearError() {
  valueInput.classList.remove('invalid');
  valueError.textContent = '';
}

function showError(message) {
  valueInput.classList.add('invalid');
  valueError.textContent = message;
}

function getSelectedUnit() {
  return unitOptions.querySelector('input[name="unit"]:checked').value;
}

function resetResults() {
  [rowC, rowF, rowK].forEach((row) => row.classList.remove('active'));
  outC.classList.remove('warning');
  outF.classList.remove('warning');
  outK.classList.remove('warning');
  outC.textContent = '—';
  outF.textContent = '—';
  outK.textContent = '—';
}

function showAbsoluteZeroWarning() {
  outC.classList.add('warning');
  outF.classList.add('warning');
  outK.classList.add('warning');
  outC.textContent = outF.textContent = outK.textContent =
    'Below absolute zero — physically impossible';
  [rowC, rowF, rowK].forEach((row) => row.classList.add('active'));
}

function showResults(celsius, activeUnit) {
  const fahrenheit = celsiusToFahrenheit(celsius);
  const kelvin = celsiusToKelvin(celsius);

  outC.textContent = `${formatTemp(celsius)} °C`;
  outF.textContent = `${formatTemp(fahrenheit)} °F`;
  outK.textContent = `${formatTemp(kelvin)} K`;

  [rowC, rowF, rowK].forEach((row) => row.classList.remove('active'));
  document.getElementById(`row-${activeUnit}`).classList.add('active');
}

// ---------- Main handler ----------
form.addEventListener('submit', (e) => {
  e.preventDefault();
  clearError();
  resetResults();

  const raw = valueInput.value.trim();

  if (raw === '') {
    showError('Please enter a temperature value.');
    return;
  }

  const value = Number(raw);

  if (Number.isNaN(value) || !/^-?\d*\.?\d+$/.test(raw)) {
    showError('Please enter a valid number (e.g. 25 or -10.5).');
    return;
  }

  const unit = getSelectedUnit();
  const celsius = toCelsius(value, unit);

  if (celsius < ABSOLUTE_ZERO_C - 1e-9) {
    showAbsoluteZeroWarning();
    return;
  }

  showResults(celsius, unit);
});

// ---------- Live re-validation while typing ----------
valueInput.addEventListener('input', () => {
  if (valueInput.classList.contains('invalid')) {
    clearError();
  }
});
