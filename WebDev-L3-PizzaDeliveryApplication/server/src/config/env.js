import 'dotenv/config';

for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable ${key} (see .env.example)`);
  }
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  admin: {
    name: process.env.ADMIN_NAME || 'Store Admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    alertEmail: process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'Pizza Palace <no-reply@pizza.local>',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },
  lowStock: {
    threshold: Number(process.env.LOW_STOCK_THRESHOLD) || 20,
    cron: process.env.LOW_STOCK_CRON || '*/30 * * * *',
  },
};

// Without Razorpay keys the app falls back to a mock checkout so it still runs end to end.
export const paymentMockMode = !(env.razorpay.keyId && env.razorpay.keySecret);
