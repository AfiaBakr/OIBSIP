import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { requireUser } from '../middleware/auth.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/mailer.js';
import { badRequest, conflict, HttpError, unauthorized } from '../utils/httpError.js';
import { createOneTimeToken, hashToken, signJwt } from '../utils/tokens.js';
import { requireEmail, requirePassword, requireString } from '../utils/validate.js';

const router = Router();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

async function issueVerification(user) {
  const { token, hash, expires } = createOneTimeToken(DAY);
  user.verifyTokenHash = hash;
  user.verifyTokenExpires = expires;
  await user.save();
  await sendVerificationEmail(user, token);
}

router.post('/register', authLimiter, async (req, res) => {
  const name = requireString(req.body.name, 'Name', { max: 60 });
  const email = requireEmail(req.body.email);
  const password = requirePassword(req.body.password);

  if (await User.exists({ email })) throw conflict('An account with this email already exists');

  const user = new User({ name, email, password });
  try {
    await issueVerification(user);
  } catch (err) {
    // The account is saved even if the email fails, so point the user to "Resend" instead of
    // letting a retry hit "email already exists".
    if (err instanceof HttpError && err.status === 502) {
      return res.status(201).json({
        message: 'Account created, but we could not send the verification email. Use "Resend verification email" on the login page.',
      });
    }
    throw err;
  }
  res.status(201).json({ message: 'Account created. Check your email for a verification link.' });
});

router.get('/verify-email/:token', async (req, res) => {
  const user = await User.findOne({
    verifyTokenHash: hashToken(req.params.token),
    verifyTokenExpires: { $gt: new Date() },
  });
  if (!user) throw badRequest('This verification link is invalid or has expired');

  user.isVerified = true;
  user.verifyTokenHash = undefined;
  user.verifyTokenExpires = undefined;
  await user.save();
  res.json({ message: 'Email verified. You can now log in.' });
});

router.post('/resend-verification', authLimiter, async (req, res) => {
  const email = requireEmail(req.body.email);
  const user = await User.findOne({ email });
  if (user && !user.isVerified) await issueVerification(user);
  // Same response either way, so this endpoint can't be used to discover registered emails.
  res.json({ message: 'If that account exists and is not verified yet, a new link is on its way.' });
});

router.post('/login', authLimiter, async (req, res) => {
  const email = requireEmail(req.body.email);
  const password = String(req.body.password || '');

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw unauthorized('Invalid email or password');
  if (!user.isVerified) {
    throw new HttpError(403, 'Please verify your email before logging in', { code: 'EMAIL_NOT_VERIFIED' });
  }
  res.json({ token: signJwt(user._id, 'user'), user });
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  const email = requireEmail(req.body.email);
  const user = await User.findOne({ email });
  if (user) {
    const { token, hash, expires } = createOneTimeToken(HOUR);
    user.resetTokenHash = hash;
    user.resetTokenExpires = expires;
    await user.save();
    await sendPasswordResetEmail(user, token);
  }
  res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
});

router.post('/reset-password/:token', authLimiter, async (req, res) => {
  const password = requirePassword(req.body.password);
  const user = await User.findOne({
    resetTokenHash: hashToken(req.params.token),
    resetTokenExpires: { $gt: new Date() },
  });
  if (!user) throw badRequest('This reset link is invalid or has expired');

  user.password = password;
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  // Following the emailed link proves ownership of the address.
  user.isVerified = true;
  await user.save();
  res.json({ message: 'Password updated. You can now log in.' });
});

router.get('/me', requireUser, (req, res) => {
  res.json({ user: req.user });
});

router.patch('/me', requireUser, async (req, res) => {
  const { name, phone, address } = req.body;
  if (name !== undefined) req.user.name = requireString(name, 'Name', { max: 60 });
  if (phone !== undefined) req.user.phone = String(phone).trim().slice(0, 20);
  if (address !== undefined) req.user.address = String(address).trim().slice(0, 300);
  await req.user.save();
  res.json({ user: req.user });
});

export default router;
