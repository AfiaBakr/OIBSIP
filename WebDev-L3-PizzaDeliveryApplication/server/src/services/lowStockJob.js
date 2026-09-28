import cron from 'node-cron';
import Inventory from '../models/Inventory.js';
import { env } from '../config/env.js';
import { sendLowStockEmail } from './mailer.js';

/**
 * Emails the admin about items below their threshold. Each shortage is reported once: the item
 * is stamped with lowStockAlertedAt, and the stamp is cleared when stock recovers, so the next
 * shortage triggers a fresh alert.
 */
export async function runLowStockCheck() {
  await Inventory.updateMany(
    { lowStockAlertedAt: { $ne: null }, $expr: { $gte: ['$stock', '$threshold'] } },
    { $set: { lowStockAlertedAt: null } }
  );

  const low = await Inventory.find({
    lowStockAlertedAt: null,
    $expr: { $lt: ['$stock', '$threshold'] },
  }).sort({ category: 1, name: 1 });

  if (low.length === 0) return { alerted: [] };

  await sendLowStockEmail(low);
  await Inventory.updateMany({ _id: { $in: low.map((i) => i._id) } }, { $set: { lowStockAlertedAt: new Date() } });
  console.log(`[low-stock] Alert sent for: ${low.map((i) => i.name).join(', ')}`);
  return { alerted: low.map((i) => i.name) };
}

export function startLowStockJob() {
  if (!cron.validate(env.lowStock.cron)) {
    throw new Error(`Invalid LOW_STOCK_CRON expression: "${env.lowStock.cron}"`);
  }
  const run = () => runLowStockCheck().catch((err) => console.error('[low-stock] Check failed:', err.message));
  cron.schedule(env.lowStock.cron, run);
  console.log(`[low-stock] Scheduled with "${env.lowStock.cron}"`);
  run();
}
