import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import orderRoutes from './routes/orders.js';
import { HttpError } from './utils/httpError.js';

export function createApp() {
  const app = express();
  // Behind a hosting proxy (e.g. Render), trust X-Forwarded-For so rate limits see real client IPs.
  if (env.trustProxy) app.set('trust proxy', env.trustProxy);

  app.use(cors({ origin: env.clientUrl }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api', catalogRoutes);
  app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));

  // In production, serve the built React app from the same origin.
  const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ message: err.message, ...err.extra });
    }
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'That record already exists' });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Invalid JSON body' });
    }
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  });

  return app;
}
