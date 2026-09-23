const expressionEl = document.getElementById('expression');
const currentEl = document.getElementById('current');
const buttons = document.querySelectorAll('.btn');

let currentValue = '0';
let previousValue = null;
let pendingOperator = null;
let expressionText = '';
let justEvaluated = false;
const ERROR_MESSAGE = 'Cannot divide by 0';

function updateDisplay() {
  currentEl.textContent = currentValue;
  expressionEl.textContent = expressionText;
}

function inputNumber(digit) {
  if (currentValue === ERROR_MESSAGE || justEvaluated) {
    currentValue = '0';
    justEvaluated = false;
  }
  if (currentValue === '0') {
    currentValue = digit;
  } else {
    currentValue += digit;
  }
}

function inputDecimal() {
  if (currentValue === ERROR_MESSAGE || justEvaluated) {
    currentValue = '0';
    justEvaluated = false;
  }
  if (!currentValue.includes('.')) {
    currentValue += '.';
  }
}

function clearAll() {
  currentValue = '0';
  previousValue = null;
  pendingOperator = null;
  expressionText = '';
  justEvaluated = false;
}

function backspace() {
  if (currentValue === ERROR_MESSAGE || justEvaluated) {
    currentValue = '0';
    justEvaluated = false;
    return;
  }
  if (currentValue.length <= 1 || (currentValue.length === 2 && currentValue.startsWith('-'))) {
    currentValue = '0';
  } else {
    currentValue = currentValue.slice(0, -1);
  }
}

function compute(a, b, operator) {
  switch (operator) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      if (b === 0) return null;
      return a / b;
    default:
      return b;
  }
}

function formatResult(value) {
  if (!isFinite(value)) return ERROR_MESSAGE;
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
}

function chooseOperator(operator) {
  if (currentValue === ERROR_MESSAGE) return;

  if (pendingOperator !== null && !justEvaluated) {
    const result = compute(previousValue, parseFloat(currentValue), pendingOperator);
    if (result === null) {
      currentValue = ERROR_MESSAGE;
      previousValue = null;
      pendingOperator = null;
      expressionText = '';
      updateDisplay();
      return;
    }
    currentValue = formatResult(result);
    previousValue = parseFloat(currentValue);
  } else {
    previousValue = parseFloat(currentValue);
  }

  pendingOperator = operator;
  expressionText = `${previousValue} ${operator}`;
  justEvaluated = false;
  currentValue = '0';
}

function evaluate() {
  if (currentValue === ERROR_MESSAGE || pendingOperator === null) return;

  const result = compute(previousValue, parseFloat(currentValue), pendingOperator);
  expressionText = `${previousValue} ${pendingOperator} ${currentValue} =`;

  if (result === null) {
    currentValue = ERROR_MESSAGE;
  } else {
    currentValue = formatResult(result);
  }

  previousValue = null;
  pendingOperator = null;
  justEvaluated = true;
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    const value = button.dataset.value;

    switch (action) {
      case 'number':
        inputNumber(value);
        break;
      case 'decimal':
        inputDecimal();
        break;
      case 'operator':
        chooseOperator(value);
        break;
      case 'equals':
        evaluate();
        break;
      case 'clear':
        clearAll();
        break;
      case 'backspace':
        backspace();
        break;
    }

    updateDisplay();
  });
});

updateDisplay();
