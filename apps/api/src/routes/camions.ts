import { Router } from 'express';
import { z } from 'zod';
import { erreurs } from '../lib/erreurs.js';
import { codeErreurPrisma } from '../lib/erreursPrisma.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export const routeurCamions = Router();
routeurCamions.use(requireAuth);

const schemaId = z.object({ id: z.uuid() });

const champs = {
  // « 1234 tba » → « 1234 TBA »
  immatriculation: z
    .string()
    .trim()
    .min(1, 'L’immatriculation est obligatoire')
    .max(20)
    .transform((valeur) => valeur.replace(/\s+/g, ' ').toUpperCase()),
  nom: z.string().trim().min(1, 'Le nom est obligatoire').max(80),
  actif: z.boolean(),
};
const schemaCreation = z.object({ ...champs, actif: champs.actif.default(true) });
// Modification : seuls les champs envoyés changent (pas de valeur par défaut).
const schemaModification = z.object(champs).partial();

/** Traduit les erreurs de base de données en messages compréhensibles. */
function traduireErreur(erreur: unknown, immatriculation?: string): never {
  switch (codeErreurPrisma(erreur)) {
    case 'P2002':
      throw erreurs.dejaExistant(
        `Un camion porte déjà l’immatriculation ${immatriculation ?? ''}`.trim(),
      );
    case 'P2003':
      throw erreurs.enCoursUtilisation(
        'Ce camion a déjà des journées, des photos ou des envois : désactivez-le plutôt que de le supprimer.',
      );
    case 'P2025':
      throw erreurs.nonTrouve('Camion introuvable');
    default:
      throw erreur;
  }
}

routeurCamions.get('/', async (_req, res) => {
  const camions = await prisma.camion.findMany({
    orderBy: [{ actif: 'desc' }, { immatriculation: 'asc' }],
  });
  res.json({ camions });
});

routeurCamions.post('/', async (req, res) => {
  const donnees = schemaCreation.parse(req.body);
  try {
    const camion = await prisma.camion.create({ data: donnees });
    res.status(201).json({ camion });
  } catch (erreur) {
    traduireErreur(erreur, donnees.immatriculation);
  }
});

routeurCamions.patch('/:id', async (req, res) => {
  const { id } = schemaId.parse(req.params);
  const donnees = schemaModification.parse(req.body);
  try {
    const camion = await prisma.camion.update({ where: { id }, data: donnees });
    res.json({ camion });
  } catch (erreur) {
    traduireErreur(erreur, donnees.immatriculation);
  }
});

routeurCamions.delete('/:id', async (req, res) => {
  const { id } = schemaId.parse(req.params);
  try {
    await prisma.camion.delete({ where: { id } });
    res.status(204).end();
  } catch (erreur) {
    traduireErreur(erreur);
  }
});
