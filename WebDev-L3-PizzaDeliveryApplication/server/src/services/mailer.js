import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const smtpConfigured = Boolean(env.smtp.host);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : null;

export async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    // No SMTP configured: print the email so links can still be used during local development.
    console.log(`\n----- EMAIL (SMTP not configured) -----\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---------------------------------------\n`);
    return;
  }
  try {
    await transporter.sendMail({ from: env.smtp.from, to, subject, html, text });
  } catch (err) {
    console.error(`[email] Could not send "${subject}" to ${to}: ${err.message}`);
    throw new HttpError(502, 'We could not send the email right now. Please try again in a few minutes.');
  }
}

/** Logs at startup whether the SMTP settings actually work, so a bad config shows up immediately. */
export async function checkMailer() {
  if (!transporter) {
    console.log('Email: SMTP not configured, emails will be printed to this console');
    return;
  }
  try {
    await transporter.verify();
    console.log(`Email: SMTP ready (${env.smtp.host}:${env.smtp.port})`);
  } catch (err) {
    console.error(`Email: SMTP connection FAILED (${env.smtp.host}:${env.smtp.port}, secure=${env.smtp.secure}): ${err.message}`);
    console.error('       Use port 465 with SMTP_SECURE=true, or port 587 with SMTP_SECURE=false.');
  }
}

const layout = (title, body) => `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
    <h2 style="color:#d9480f;margin-top:0">🍕 Pizza Palace</h2>
    <h3>${title}</h3>
    ${body}
  </div>`;

const button = (href, label) =>
  `<p><a href="${href}" style="display:inline-block;background:#d9480f;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${label}</a></p>
   <p style="color:#666;font-size:13px">Or paste this link into your browser:<br>${href}</p>`;

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function sendVerificationEmail(user, token) {
  const link = `${env.clientUrl}/verify-email/${token}`;
  return sendMail({
    to: user.email,
    subject: 'Verify your Pizza Palace account',
    text: `Hi ${user.name},\n\nVerify your email address by opening this link (valid for 24 hours):\n${link}`,
    html: layout(
      `Welcome, ${escapeHtml(user.name)}!`,
      `<p>Please confirm your email address to start ordering. This link is valid for 24 hours.</p>${button(link, 'Verify email')}`
    ),
  });
}

export function sendPasswordResetEmail(user, token) {
  const link = `${env.clientUrl}/reset-password/${token}`;
  return sendMail({
    to: user.email,
    subject: 'Reset your Pizza Palace password',
    text: `Hi ${user.name},\n\nReset your password with this link (valid for 1 hour):\n${link}\n\nIf you didn't request this, you can ignore this email.`,
    html: layout(
      'Password reset',
      `<p>We received a request to reset your password. This link is valid for 1 hour.</p>${button(link, 'Reset password')}
       <p>If you didn't request this, you can ignore this email.</p>`
    ),
  });
}

export function sendLowStockEmail(items) {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 10px">${escapeHtml(i.name)}</td><td style="padding:6px 10px">${i.category}</td>` +
        `<td style="padding:6px 10px;color:#c92a2a;font-weight:bold">${i.stock}</td><td style="padding:6px 10px">${i.threshold}</td></tr>`
    )
    .join('');
  return sendMail({
    to: env.admin.alertEmail,
    subject: `Low stock alert: ${items.length} item${items.length > 1 ? 's' : ''} ${items.length > 1 ? 'need' : 'needs'} restocking`,
    text:
      'These inventory items are below their threshold:\n\n' +
      items.map((i) => `- ${i.name} (${i.category}): ${i.stock} left, threshold ${i.threshold}`).join('\n') +
      `\n\nUpdate stock at ${env.clientUrl}/admin`,
    html: layout(
      'Low stock alert',
      `<p>These inventory items are below their threshold:</p>
       <table style="border-collapse:collapse;width:100%" border="1" bordercolor="#eee">
         <tr style="background:#fff4e6"><th align="left" style="padding:6px 10px">Item</th><th align="left" style="padding:6px 10px">Category</th><th align="left" style="padding:6px 10px">In stock</th><th align="left" style="padding:6px 10px">Threshold</th></tr>
         ${rows}
       </table>
       ${button(`${env.clientUrl}/admin`, 'Open inventory')}`
    ),
  });
}
