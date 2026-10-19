import { Router } from 'express';
import { z } from 'zod';
import { erreurs } from '../lib/erreurs.js';
import { verifierMotDePasse } from '../lib/motDePasse.js';
import { prisma } from '../lib/prisma.js';
import {
  dureeSessionMs,
  NOM_COOKIE_SESSION,
  optionsCookieSession,
  signerSession,
} from '../lib/session.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export const routeurAuth = Router();

const schemaConnexion = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  motDePasse: z.string().min(1),
});

// Hash factice : on compare quand même si l'email est inconnu, pour ne pas révéler son existence par le temps de réponse.
const HASH_FACTICE = '$2b$12$o8uQN8LmQAcjjUmU4lTki.OdP4m6zEHZzodLqnji9EVRItuORpOqy';

routeurAuth.post('/connexion', async (req, res) => {
  const { email, motDePasse } = schemaConnexion.parse(req.body);
  const utilisateur = await prisma.utilisateur.findUnique({ where: { email } });
  const valide = await verifierMotDePasse(motDePasse, utilisateur?.motDePasseHash ?? HASH_FACTICE);
  if (!utilisateur || !valide) throw erreurs.identifiantsInvalides();

  const jeton = signerSession({ sub: utilisateur.id, email: utilisateur.email });
  res.cookie(NOM_COOKIE_SESSION, jeton, { ...optionsCookieSession, maxAge: dureeSessionMs });
  res.json({ utilisateur: { id: utilisateur.id, email: utilisateur.email } });
});

routeurAuth.post('/deconnexion', (_req, res) => {
  res.clearCookie(NOM_COOKIE_SESSION, optionsCookieSession);
  res.status(204).end();
});

routeurAuth.get('/moi', requireAuth, (req, res) => {
  if (!req.utilisateur) throw erreurs.nonAuthentifie();
  const { sub, email } = req.utilisateur;
  res.json({ utilisateur: { id: sub, email } });
});
