# Pizza Delivery Application

A full-stack pizza ordering and inventory management platform with separate user and admin roles, a 4-step custom pizza builder, Razorpay checkout (test mode), live order tracking, and automatic low-stock email alerts. Built as part of the Oasis Infobyte Web Development Internship (Level 3).

**Tech stack:** React (Vite) · Node.js + Express · MongoDB (Mongoose) · Socket.IO · Razorpay · Nodemailer · node-cron

## Features

### User side
- **Registration with email verification**: new accounts can't log in until the emailed link is opened (valid for 24 hours). The verification email can be resent from the login page.
- **JWT login**: the token is sent as a `Bearer` header, and every protected API route checks it.
- **Forgot password**: an emailed reset link, valid for 1 hour and usable once.
- **Home page with the menu (public)**: anyone can browse the preset pizzas (filters: Classic / Veggie / Spicy / Premium) and the builder. **Adding to cart requires login**: guests are sent to the login page, and the pizza they picked is added to their cart right after they log in. Logged-in users also see a live panel for orders in progress.
- **Custom pizza builder**: Base (5 options) → Sauce (5 options) → Cheese → Vegetables (multi-select) → Review. A pizza preview is drawn from your choices as you go, and the price updates live.
- **Order summary page**: cart with quantities, delivery details, subtotal, delivery fee (Rs 150, free on orders of Rs 2,500 or more), and total. All prices are in Pakistani rupees (PKR).
- **Razorpay checkout (test mode)**: the server creates the Razorpay order and verifies the payment signature before confirming anything.
- **Real-time order status**: Order Received → In Kitchen → Sent to Delivery → Delivered, pushed over WebSockets.

### Admin side
- **Separate admin login** at `/admin/login`. Admins are stored in their own collection and created only by the seed script, so the public sign-up can never create one. The admin session is kept separately from the customer session, so one browser can be logged in as both.
- **Inventory dashboard**: stock for bases, sauces, cheeses, and vegetables, with stock meters, low-stock highlighting, and today's order and revenue stats.
- **Stock drops automatically after each order.** Every decrement is conditional, so two orders placed at once can never push stock below zero.
- **Manual stock updates**: quick +10 / +50 restock, or edit stock, threshold, and price directly. New inventory items can be added too.
- **Low-stock email alerts**: a `node-cron` job (every 30 minutes by default) emails the admin when any item falls below its threshold (default 20). Each shortage is reported once, then re-armed after restocking.
- **Order management**: filter by status, move orders through the flow or cancel them. New orders appear instantly.
- **Live sync**: status changes appear on the customer's dashboard immediately through Socket.IO.

## Project structure

```
WebDev-L3-PizzaDeliveryApplication/
├── server/                 Express API
│   ├── src/
│   │   ├── config/         env + MongoDB connection
│   │   ├── models/         User, Admin, Inventory, Pizza, Order
│   │   ├── middleware/     JWT auth (requireUser / requireAdmin)
│   │   ├── routes/         auth, catalog, orders, admin
│   │   ├── services/       mailer, payment (Razorpay), stock, socket, lowStockJob
│   │   ├── app.js          Express app + error handling
│   │   ├── index.js        HTTP + Socket.IO server, starts the cron job
│   │   └── seed.js         admin account + starter menu
│   └── .env.example
└── client/                 React app (Vite)
    └── src/
        ├── context/        Auth + Cart state
        ├── lib/            API client, socket hook, live orders hook
        ├── components/     layouts, route guards, order tracker, pizza preview
        └── pages/          auth/, user/, admin/
```

## Getting started

**Requirements:** Node.js 20+, and MongoDB (local or Atlas).

```bash
# 1. API
cd server
npm install
cp .env.example .env        # then edit .env (see below)
npm run seed                # creates the admin account + menu (prices in PKR)
# npm run seed:reset-prices # optional: reset existing item prices to the seed values
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173 to use the store, or http://localhost:5173/admin/login for the admin panel. The default admin is `admin@pizza.local` / `Admin@123`; change it in `.env` before seeding.

### Configuration (`server/.env`)

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | Long random string used to sign tokens |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin account created by `npm run seed` |
| `ADMIN_ALERT_EMAIL` | Where low-stock alerts go (defaults to `ADMIN_EMAIL`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Email delivery. **If `SMTP_HOST` is empty, emails are printed to the server console** so verification and reset links still work locally. For Gmail, use `smtp.gmail.com`, port `465`, `SMTP_SECURE=true`, and an [App Password](https://myaccount.google.com/apppasswords). |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay **test** keys. **If these are empty, a built-in mock checkout** with Success / Failure buttons is used instead. |
| `LOW_STOCK_THRESHOLD` | Default alert threshold for new items (each item's threshold can be edited) |
| `LOW_STOCK_CRON` | Schedule for the stock check, e.g. `*/30 * * * *` |

### Testing payments with Razorpay

1. Get test keys from the [Razorpay dashboard](https://dashboard.razorpay.com/app/keys) (Test Mode) and put them in `server/.env`.
2. At checkout, choose **Netbanking**, pick any bank, and click **Success** on Razorpay's test page. The server verifies the signature, deducts stock, and the order shows up as *Order Received*.
3. Test cards such as `4111 1111 1111 1111` (any future expiry, any CVV) also work.

## How it works

**Checkout flow**
1. `POST /api/orders`: the server prices the cart from the database (never from the client), checks stock, and creates a Razorpay order. The order starts as *Pending Payment*.
2. The browser opens Razorpay Checkout.
3. `POST /api/orders/:id/verify`: the server checks the HMAC-SHA256 signature. It then atomically marks the order paid (so a double submit can't deduct stock twice), decrements stock, and emits `order:new` to admins.
4. If an ingredient sells out between checkout and payment, the order is cancelled and flagged `refund_pending` for the admin.

**Real-time updates:** the Socket.IO handshake is authenticated with the same JWT. Each user joins a private room (`user:<id>`) and admins join `admins`, so a customer only ever receives their own order updates.

**Security notes:** passwords are hashed with bcrypt (12 rounds). Only SHA-256 hashes of verification and reset tokens are stored. Auth endpoints are rate-limited. Login and forgot-password responses don't reveal whether an email is registered.

## API overview

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Public |
| GET | `/api/auth/verify-email/:token` | Public |
| POST | `/api/auth/resend-verification`, `/api/auth/forgot-password`, `/api/auth/reset-password/:token` | Public |
| GET | `/api/pizzas`, `/api/ingredients`, `/api/config` | Public |
| POST | `/api/orders`, `/api/orders/:id/verify`, `/api/orders/:id/cancel` | User |
| GET | `/api/orders/mine`, `/api/orders/:id` | User |
| POST | `/api/admin/login` | Public |
| GET / POST / PATCH | `/api/admin/inventory`, `/api/admin/inventory/:id` | Admin |
| POST | `/api/admin/inventory/check-low-stock` | Admin |
| GET / PATCH | `/api/admin/orders`, `/api/admin/orders/:id/status` | Admin |
| GET | `/api/admin/stats` | Admin |

## Production build

```bash
cd client && npm run build
cd ../server && npm start
```

When `client/dist` exists, the Express server serves the React app itself, so the whole app runs from one origin on `PORT`.
