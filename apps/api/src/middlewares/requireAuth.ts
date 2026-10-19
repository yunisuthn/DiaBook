import type { RequestHandler } from 'express';
import { erreurs } from '../lib/erreurs.js';
import { lireSession, NOM_COOKIE_SESSION } from '../lib/session.js';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const jeton: unknown = req.cookies?.[NOM_COOKIE_SESSION];
  const session = typeof jeton === 'string' ? lireSession(jeton) : null;
  if (!session) throw erreurs.nonAuthentifie();
  req.utilisateur = session;
  next();
};
