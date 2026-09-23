# Login Authentication System

https://afia-login-authentication-system.netlify.app/

An authentication system with user registration, login, and a protected dashboard. Built as part of the Oasis Infobyte Web Development Internship (Level 2, Task 4).

The project comes in two versions:

- **Static version** (project root): runs entirely in the browser, so it can be hosted on Netlify or any static host. Users are saved in `localStorage` and passwords are hashed with PBKDF2 (Web Crypto API).
- **Server version** (`node-server/`): Node.js + Express backend with bcrypt, SQLite, and server-side sessions.

## Features

- **Registration page**: username, email, password, and confirm-password fields with a "Register" button.
- **Password rules**: at least 8 characters and at least 1 number. A live checklist under the field ticks each rule as it is met.
- **Duplicate check**: registering with a username or email that already exists shows an error. The check ignores case, so `Afia` and `afia` count as the same name.
- **Login page**: log in with either your username or your email, plus your password.
- **Safe error messages**: a wrong username and a wrong password both show the same message, "Invalid username/email or password", so the page never reveals which field was wrong.
- **Protected dashboard**: opening the dashboard without logging in redirects to the login page.
- **Logout**: ends the session and redirects to the login page.
- **Hashed passwords**: plain-text passwords are never stored.
- **Form validation**: empty fields are blocked on both pages.
- **Extras**: show/hide password toggle, confirm-password check, and a responsive layout.

## Static Version (Netlify)

### How it works

1. **Register**: the form is validated, then the username/email is checked against existing users. The password is hashed with PBKDF2-SHA256 (100,000 iterations, random 16-byte salt per user) and the user is saved in `localStorage`.
2. **Login**: the user is looked up by username or email, and the entered password is hashed with the same salt and compared.
3. **Session**: on success the user ID and an expiry time (2 hours) are saved in `sessionStorage`, so the session ends when the tab is closed.
4. **Protected page**: `dashboard.html` stays hidden until the script confirms a valid session; otherwise it redirects to `index.html`.
5. **Logout**: removes the session and redirects to the login page.

> **Note:** because there is no server, accounts are stored only in the browser where they were created. This version is meant for demonstration; the `node-server/` version is the one to use for real server-side security.

### Deploy on Netlify

- **Drag and drop**: open <https://app.netlify.com/drop> and drop a folder containing `index.html`, `register.html`, `dashboard.html`, `style.css`, and `js/`. Leave out `node-server/`, since Netlify does not need it and it contains `node_modules` and the local database.
- **From GitHub**: create a new site from the `OIBSIP` repository, set **Base directory** to `WebDev-L2-TASK-4-LoginAuthenticationSystem`, leave the build command empty, and set **Publish directory** to `WebDev-L2-TASK-4-LoginAuthenticationSystem`.

### Run locally

Open `index.html` in a browser, or serve the folder with any static server (for example the VS Code Live Server extension).

## Server Version (`node-server/`)

Uses **Node.js** (22.13 or newer) with the built-in `node:sqlite` module, **Express 5**, **express-session**, and **bcryptjs**.

```bash
cd node-server
npm install
npm start
```

Then open <http://localhost:3000>. Use `npm run dev` to restart automatically on file changes, and set `SESSION_SECRET` for a fixed session secret. Registered accounts are saved in `node-server/data/users.db`; delete the `data` folder to start over.

This version needs a host that runs Node.js (such as Render or Railway); it will not work on Netlify.

## File Structure

```
WebDev-L2-TASK-4-LoginAuthenticationSystem/
├── index.html         # Login page (static version)
├── register.html      # Registration page
├── dashboard.html     # Protected page
├── style.css
├── js/
│   ├── store.js       # Users (localStorage), sessions, PBKDF2 hashing
│   ├── auth.js        # Login/register validation and submission
│   └── dashboard.js   # Session guard, user details, logout
├── node-server/       # Server version (Express + SQLite + bcrypt)
│   ├── server.js
│   ├── db.js
│   ├── views/
│   ├── public/
│   └── package.json
└── README.md
```

## Author

Afia Bakr
