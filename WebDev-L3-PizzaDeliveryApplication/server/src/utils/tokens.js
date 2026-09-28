import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signJwt(id, role) {
  return jwt.sign({ sub: String(id), role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyJwt(token) {
  return jwt.verify(token, env.jwtSecret);
}

// One-time tokens for email verification and password reset. Only the SHA-256 hash is stored,
// so a leaked database can't be used to verify accounts or reset passwords.
export function createOneTimeToken(ttlMs) {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token), expires: new Date(Date.now() + ttlMs) };
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}
