import mongoose from 'mongoose';
import { badRequest } from './httpError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw badRequest('Please enter a valid email address');
  return email;
}

export function requirePassword(value) {
  const password = String(value || '');
  if (password.length < 8 || !/\d/.test(password) || !/[A-Za-z]/.test(password)) {
    throw badRequest('Password must be at least 8 characters and contain letters and numbers');
  }
  return password;
}

export function requireString(value, field, { max = 200 } = {}) {
  const str = String(value ?? '').trim();
  if (!str) throw badRequest(`${field} is required`);
  if (str.length > max) throw badRequest(`${field} must be at most ${max} characters`);
  return str;
}

export function requireObjectId(value, field) {
  if (!mongoose.isValidObjectId(value)) throw badRequest(`Invalid ${field}`);
  return String(value);
}
