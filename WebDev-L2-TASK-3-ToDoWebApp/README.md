# To-Do Web App

https://afia-todo-web-app.netlify.app/

An interactive to-do list for managing daily tasks. Tasks can be added, marked complete, edited inline, and deleted, and they are split into Pending and Completed lists. Built as part of the Oasis Infobyte Web Development Internship (Level 2, Task 3).

## Features

- **Add tasks**: an input field and an "Add Task" button (or press Enter). Blank input shows an inline error.
- **Pending and Completed lists**: new tasks go straight to the top of Pending.
- **Mark complete**: each task has a checkbox. Ticking it moves the task to Completed, and unticking moves it back to Pending.
- **Inline editing**: click **Edit** to turn the task text into an input. Press Enter (or click away) to save, or Escape to cancel.
- **Delete**: removes a task permanently from either list.
- **Task counts**: "X pending" and "Y completed" badges above each list.
- **Timestamps** *(bonus)*: each task shows when it was added and, once finished, when it was completed.
- **Persistence** : tasks are saved to `localStorage` and survive page refreshes.
- **Empty states**: a short message appears when a list has no tasks.
- **Responsive layout**: the two lists sit side by side on desktop and stack on tablets and phones.

## Tech Stack

- HTML5 (semantic markup and a `<template>` element for task items)
- CSS3 (custom properties, Grid, Flexbox, media queries; no framework)
- Vanilla JavaScript (DOM manipulation, event delegation, `localStorage`)

## How It Works

All tasks live in one array of objects:

```js
{ id, text, completed, createdAt, completedAt }
```

Every action (add, toggle, edit, delete) updates this array, saves it to `localStorage`, and calls `render()`, which rebuilds both lists, the counts, and the empty-state messages from the array. Task text is inserted with `textContent`, so any HTML typed into a task is shown as plain text.

## Checking Saved Tasks in localStorage

You can see the saved tasks from the browser's developer tools:

1. Open `index.html` in the browser and add a few tasks.
2. Right-click anywhere on the page and choose **Inspect** (or press **F12**).
3. Open the **Console** tab.
4. Type the following line and press Enter:

   ```js
   JSON.parse(localStorage.getItem('oibsip-todo-tasks'))
   ```

5. The console prints an array of your tasks, for example:

   ```js
   [{ id: "muekqjdo27mim", text: "Buy milk", completed: false, createdAt: 1790196437148, completedAt: null }]
   ```

   Click the arrow next to the array to expand each task.

Notes:

- JavaScript is case-sensitive: write `localStorage` and `getItem` exactly as shown, or you will get `ReferenceError: localstorage is not defined`.
- A result of `null` means no tasks have been saved yet.
- `createdAt` and `completedAt` are timestamps in milliseconds. To read one as a date, run `new Date(1790196437148)` in the console.
- To clear all saved tasks, run `localStorage.removeItem('oibsip-todo-tasks')` and refresh the page.

## File Structure

```
WebDev-L2-TASK-3-ToDoWebApp/
├── index.html   # Page markup: add-task form, the two lists, task template
├── style.css    # Styling and responsive layout
├── script.js    # Task state, rendering, editing, and localStorage
└── README.md
```

## Running Locally

No build step is needed. Open `index.html` in a web browser, or serve the folder with a local static server, for example:

```bash
npx serve .
```

## Author

Afia Bakr
