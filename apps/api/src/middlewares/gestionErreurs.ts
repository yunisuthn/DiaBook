import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { ZodError, z } from 'zod';
import { ErreurApi, erreurs } from '../lib/erreurs.js';

export const routeIntrouvable: RequestHandler = (req) => {
  throw erreurs.nonTrouve(`Route introuvable : ${req.method} ${req.path}`);
};

function estErreurJsonInvalide(erreur: unknown): boolean {
  return (
    erreur instanceof SyntaxError &&
    (erreur as SyntaxError & { type?: string }).type === 'entity.parse.failed'
  );
}

function traduireErreurEnvoi(erreur: multer.MulterError): [number, string, string] {
  switch (erreur.code) {
    case 'LIMIT_FILE_SIZE':
      return [413, 'PHOTO_TROP_LOURDE', 'Une photo dépasse 15 Mo'];
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_UNEXPECTED_FILE':
      return [400, 'TROP_DE_PHOTOS', '20 photos au plus par envoi (champ « photos »)'];
    default:
      return [400, 'ENVOI_INVALIDE', `Envoi invalide : ${erreur.message}`];
  }
}

/** Toutes les erreurs sortent au format { erreur: { code, message } }. */
export const gestionErreurs: ErrorRequestHandler = (erreur: unknown, _req, res, _next) => {
  if (erreur instanceof ErreurApi) {
    res.status(erreur.statut).json({ erreur: { code: erreur.code, message: erreur.message } });
    return;
  }
  if (erreur instanceof ZodError) {
    res
      .status(400)
      .json({ erreur: { code: 'DONNEES_INVALIDES', message: z.prettifyError(erreur) } });
    return;
  }
  if (erreur instanceof multer.MulterError) {
    const [statut, code, message] = traduireErreurEnvoi(erreur);
    res.status(statut).json({ erreur: { code, message } });
    return;
  }
  if (estErreurJsonInvalide(erreur)) {
    res.status(400).json({ erreur: { code: 'JSON_INVALIDE', message: 'Corps JSON invalide' } });
    return;
  }

  console.error(erreur);
  res
    .status(500)
    .json({ erreur: { code: 'ERREUR_INTERNE', message: 'Erreur interne du serveur' } });
};
