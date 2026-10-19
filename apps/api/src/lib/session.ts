import type { CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import { config, estProduction } from '../config.js';

export const NOM_COOKIE_SESSION = 'diabook_session';
const DUREE_SESSION_SECONDES = 7 * 24 * 60 * 60;

export interface ContenuSession {
  sub: string;
  email: string;
}

export const optionsCookieSession: CookieOptions = {
  httpOnly: true,
  secure: estProduction,
  sameSite: 'lax',
  path: '/',
};

export function signerSession(contenu: ContenuSession): string {
  return jwt.sign(contenu, config.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: DUREE_SESSION_SECONDES,
  });
}

export function lireSession(jeton: string): ContenuSession | null {
  try {
    const decode = jwt.verify(jeton, config.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decode === 'string' || typeof decode.sub !== 'string') return null;
    return { sub: decode.sub, email: String(decode.email) };
  } catch {
    return null;
  }
}

export const dureeSessionMs = DUREE_SESSION_SECONDES * 1000;
