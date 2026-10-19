import type { ContenuSession } from './lib/session.js';

declare global {
  namespace Express {
    interface Request {
      /** Renseigné par le middleware requireAuth. */
      utilisateur?: ContenuSession;
    }
  }
}

export {};
