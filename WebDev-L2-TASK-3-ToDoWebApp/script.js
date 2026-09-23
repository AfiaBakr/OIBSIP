const form = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const formError = document.getElementById('formError');
const todayLabel = document.getElementById('todayLabel');

const pendingList = document.getElementById('pendingList');
const completedList = document.getElementById('completedList');
const pendingCount = document.getElementById('pendingCount');
const completedCount = document.getElementById('completedCount');
const pendingEmpty = document.getElementById('pendingEmpty');
const completedEmpty = document.getElementById('completedEmpty');
const taskTemplate = document.getElementById('taskTemplate');

const STORAGE_KEY = 'oibsip-todo-tasks';

// Each task: { id, text, completed, createdAt, completedAt }
let tasks = loadTasks();

// ---------- Storage ----------
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Storage can be unavailable (private mode, quota); the app still works for this session.
  }
}

// ---------- Helpers ----------
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function findTask(id) {
  return tasks.find((task) => task.id === id);
}

// ---------- Actions ----------
function addTask(text) {
  tasks.unshift({
    id: createId(),
    text,
    completed: false,
    createdAt: Date.now(),
    completedAt: null,
  });
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = findTask(id);
  if (!task) return;
  task.completed = !task.completed;
  task.completedAt = task.completed ? Date.now() : null;
  saveTasks();
  render();
}

function updateTask(id, newText) {
  const task = findTask(id);
  if (!task) return;
  task.text = newText;
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks();
  render();
}

// ---------- Rendering ----------
function buildTaskElement(task) {
  const item = taskTemplate.content.firstElementChild.cloneNode(true);
  item.dataset.id = task.id;
  item.classList.toggle('is-done', task.completed);

  const toggle = item.querySelector('.task-toggle');
  toggle.checked = task.completed;
  toggle.setAttribute(
    'aria-label',
    task.completed ? `Mark "${task.text}" as pending` : `Mark "${task.text}" complete`
  );

  item.querySelector('.task-text').textContent = task.text;

  const meta = item.querySelector('.task-meta');
  const added = document.createElement('span');
  added.textContent = `Added ${formatTime(task.createdAt)}`;
  meta.append(added);
  if (task.completed && task.completedAt) {
    const done = document.createElement('span');
    done.textContent = `Completed ${formatTime(task.completedAt)}`;
    meta.append(done);
  }

  item.querySelector('.btn-edit').setAttribute('aria-label', `Edit "${task.text}"`);
  item.querySelector('.btn-delete').setAttribute('aria-label', `Delete "${task.text}"`);

  return item;
}

function render() {
  const pending = tasks.filter((task) => !task.completed);
  // Most recently completed first
  const completed = tasks
    .filter((task) => task.completed)
    .sort((a, b) => b.completedAt - a.completedAt);

  pendingList.replaceChildren(...pending.map(buildTaskElement));
  completedList.replaceChildren(...completed.map(buildTaskElement));

  pendingCount.textContent = `${pending.length} pending`;
  completedCount.textContent = `${completed.length} completed`;

  pendingEmpty.hidden = pending.length > 0;
  completedEmpty.hidden = completed.length > 0;
}

// ---------- Inline editing ----------
function startEditing(item) {
  const task = findTask(item.dataset.id);
  if (!task || item.classList.contains('is-editing')) return;

  item.classList.add('is-editing');
  const textEl = item.querySelector('.task-text');
  const editBtn = item.querySelector('.btn-edit');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit-input';
  input.value = task.text;
  input.maxLength = 200;
  input.setAttribute('aria-label', 'Edit task text');

  textEl.replaceWith(input);
  editBtn.textContent = 'Save';
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  let finished = false;
  function finish(save) {
    if (finished) return;
    finished = true;
    const newText = input.value.trim();
    if (save && newText && newText !== task.text) {
      updateTask(task.id, newText);
    } else {
      render();
    }
  }

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') finish(true);
    if (event.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

// ---------- Events ----------
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();

  if (!text) {
    formError.textContent = 'Please enter a task before adding it.';
    taskInput.classList.add('invalid');
    taskInput.focus();
    return;
  }

  addTask(text);
  form.reset();
  taskInput.focus();
});

taskInput.addEventListener('input', () => {
  formError.textContent = '';
  taskInput.classList.remove('invalid');
});

// One delegated listener per list handles every task inside it
function handleListClick(event) {
  const item = event.target.closest('.task');
  if (!item) return;

  if (event.target.classList.contains('task-toggle')) {
    toggleTask(item.dataset.id);
  } else if (event.target.classList.contains('btn-edit')) {
    startEditing(item);
  } else if (event.target.classList.contains('btn-delete')) {
    deleteTask(item.dataset.id);
  }
}

pendingList.addEventListener('click', handleListClick);
completedList.addEventListener('click', handleListClick);

// ---------- Init ----------
todayLabel.textContent = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

render();
