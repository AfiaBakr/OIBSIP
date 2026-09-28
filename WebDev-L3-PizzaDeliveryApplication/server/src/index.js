import http from 'node:http';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env, paymentMockMode } from './config/env.js';
import { startLowStockJob } from './services/lowStockJob.js';
import { checkMailer } from './services/mailer.js';
import { initSocket } from './services/socket.js';

await connectDB();

const server = http.createServer(createApp());
initSocket(server);
startLowStockJob();

server.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  console.log(`Payments: ${paymentMockMode ? 'mock checkout (no Razorpay keys set)' : 'Razorpay test mode'}`);
  checkMailer();
});
