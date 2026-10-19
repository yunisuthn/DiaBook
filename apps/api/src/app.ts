import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { dossierLocal } from './lib/stockage.js';
import { gestionErreurs, routeIntrouvable } from './middlewares/gestionErreurs.js';
import { requireAuth } from './middlewares/requireAuth.js';
import { routeurAuth } from './routes/auth.js';
import { routeurCamions } from './routes/camions.js';
import { routeurLots } from './routes/lots.js';
import { routeurPersonnes } from './routes/personnes.js';
import { routeurSante } from './routes/sante.js';

export function creerApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api/sante', routeurSante);
  app.use('/api/auth', routeurAuth);
  app.use('/api/camions', routeurCamions);
  app.use('/api/personnes', routeurPersonnes);
  app.use('/api/lots', routeurLots);
  // Développement sans Cloudinary : photos stockées sur disque, réservées aux utilisateurs connectés.
  if (dossierLocal) app.use('/api/fichiers', requireAuth, express.static(dossierLocal));

  app.use(routeIntrouvable);
  app.use(gestionErreurs);

  return app;
}
