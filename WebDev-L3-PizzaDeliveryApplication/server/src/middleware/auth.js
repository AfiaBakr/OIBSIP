import User from '../models/User.js';
import Admin from '../models/Admin.js';
import { verifyJwt } from '../utils/tokens.js';
import { forbidden, unauthorized } from '../utils/httpError.js';

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function decode(req) {
  const token = readToken(req);
  if (!token) throw unauthorized();
  try {
    return verifyJwt(token);
  } catch {
    throw unauthorized('Your session has expired, please log in again');
  }
}

export async function requireUser(req, _res, next) {
  const payload = decode(req);
  if (payload.role !== 'user') throw forbidden();
  const user = await User.findById(payload.sub);
  if (!user) throw unauthorized();
  if (!user.isVerified) throw forbidden('Please verify your email address first');
  req.user = user;
  next();
}

export async function requireAdmin(req, _res, next) {
  const payload = decode(req);
  if (payload.role !== 'admin') throw forbidden('Admin access only');
  const admin = await Admin.findById(payload.sub);
  if (!admin) throw unauthorized();
  req.admin = admin;
  next();
}
