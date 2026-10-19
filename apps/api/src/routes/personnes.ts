import { Router } from 'express';
import { z } from 'zod';
import { erreurs } from '../lib/erreurs.js';
import { codeErreurPrisma } from '../lib/erreursPrisma.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export const routeurPersonnes = Router();
routeurPersonnes.use(requireAuth);

const schemaId = z.object({ id: z.uuid() });
const schemaRole = z.enum(['CHAUFFEUR', 'RECEVEUR']);

const champs = {
  nom: z.string().trim().min(1, 'Le nom est obligatoire').max(80),
  role: schemaRole,
  // Champ vide → pas de téléphone
  telephone: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .transform((valeur) => valeur || null),
  actif: z.boolean(),
};
const schemaCreation = z.object({
  ...champs,
  telephone: champs.telephone.optional(),
  actif: champs.actif.default(true),
});
// Modification : seuls les champs envoyés changent (pas de valeur par défaut).
const schemaModification = z.object(champs).partial();

function traduireErreur(erreur: unknown): never {
  switch (codeErreurPrisma(erreur)) {
    case 'P2003':
      throw erreurs.enCoursUtilisation(
        'Cette personne figure déjà dans des journées : désactivez-la plutôt que de la supprimer.',
      );
    case 'P2025':
      throw erreurs.nonTrouve('Personne introuvable');
    default:
      throw erreur;
  }
}

routeurPersonnes.get('/', async (req, res) => {
  const { role } = z.object({ role: schemaRole.optional() }).parse(req.query);
  const personnes = await prisma.personne.findMany({
    where: role ? { role } : {},
    orderBy: [{ actif: 'desc' }, { role: 'asc' }, { nom: 'asc' }],
  });
  res.json({ personnes });
});

routeurPersonnes.post('/', async (req, res) => {
  const donnees = schemaCreation.parse(req.body);
  const personne = await prisma.personne.create({ data: donnees });
  res.status(201).json({ personne });
});

routeurPersonnes.patch('/:id', async (req, res) => {
  const { id } = schemaId.parse(req.params);
  const donnees = schemaModification.parse(req.body);
  try {
    const personne = await prisma.personne.update({ where: { id }, data: donnees });
    res.json({ personne });
  } catch (erreur) {
    traduireErreur(erreur);
  }
});

routeurPersonnes.delete('/:id', async (req, res) => {
  const { id } = schemaId.parse(req.params);
  try {
    await prisma.personne.delete({ where: { id } });
    res.status(204).end();
  } catch (erreur) {
    traduireErreur(erreur);
  }
});
