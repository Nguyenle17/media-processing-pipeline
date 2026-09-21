import type { CookieOptions, Response } from 'express';
import * as dotenv from 'dotenv';

dotenv.config();

const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = value ? parseInt(value, 10) : NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
};

export const ACCESS_TOKEN_EXPIRES_IN =
  toInt(process.env.ACCESS_TOKEN_EXPIRATION_MINUTES, 15) * 60 * 1000;

export const REFRESH_TOKEN_EXPIRES_IN =
  toInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS, 7) * 24 * 60 * 60 * 1000;

export const REFRESH_COOKIE_NAME = 'refresh_token';

const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: 'lax',
  path: '/',
});

export const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...refreshCookieOptions(),
    maxAge: REFRESH_TOKEN_EXPIRES_IN,
  });
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
};

export const OAUTH_STATE_PATH = process.env.OAUTH_STATE_PATH || '/auth/google';

export const stateCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: 'lax',
  path: OAUTH_STATE_PATH,
});

export const GOOGLE_AUTH_URL =
  process.env.GOOGLE_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth';

export const GOOGLE_TOKEN_URL =
  process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';

export const GOOGLE_USERINFO_URL =
  process.env.GOOGLE_USERINFO_URL ||
  'https://www.googleapis.com/oauth2/v3/userinfo';

export const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  'http://localhost:3000/auth/google/callback';

export const REQUEST_TIMEOUT_MS = toInt(process.env.REQUEST_TIMEOUT_MS, 10_000);
