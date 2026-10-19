import { Router } from 'express';

export const routeurSante = Router();

routeurSante.get('/', (_req, res) => {
  res.json({ statut: 'ok', horodatage: new Date().toISOString() });
});
