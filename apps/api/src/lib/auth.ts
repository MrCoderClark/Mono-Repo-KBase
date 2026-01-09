import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const JWT_SECRET = process.env.AUTH_SECRET || 'dev-secret-change-in-production';
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 7;
const PASSWORD_RESET_EXPIRES_HOURS = 1;
const EMAIL_VERIFICATION_EXPIRES_HOURS = 24;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

export function getRefreshTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  return expiry;
}

export function getPasswordResetExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + PASSWORD_RESET_EXPIRES_HOURS);
  return expiry;
}

export function getEmailVerificationExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + EMAIL_VERIFICATION_EXPIRES_HOURS);
  return expiry;
}

export function isAccountLocked(lockedUntil: Date | null): boolean {
  if (!lockedUntil) return false;
  return new Date() < lockedUntil;
}

export function getLockoutExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + LOCKOUT_DURATION_MINUTES);
  return expiry;
}

export const AUTH_CONFIG = {
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
  REFRESH_TOKEN_EXPIRES_DAYS,
  PASSWORD_RESET_EXPIRES_HOURS,
  EMAIL_VERIFICATION_EXPIRES_HOURS,
};
