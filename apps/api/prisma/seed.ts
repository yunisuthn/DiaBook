// Données initiales : compte administrateur (ADMIN_EMAIL / ADMIN_PASSWORD), le dictionnaire des lieux
// du prototype et, sur une base vide, un camion, un chauffeur et un receveur d'exemple
// (à remplacer depuis Paramètres). Relançable sans créer de doublons.
import { config } from '../src/config.js';
import type { RolePersonne } from '../src/generated/prisma/client.js';
import { hacherMotDePasse } from '../src/lib/motDePasse.js';
import { prisma } from '../src/lib/prisma.js';

// Repris de cahier-extract/src/lieux.js.
const LIEUX = [
  'Ambohitrimanjaka',
  'Ambohitrarahaba',
  'Ambohipanja',
  'Ambodifahitra',
  'Ambatomitsangana',
  'Ambatofotsy',
  'Ankadivoribe',
  'Antanetibe',
  'Antanety',
  'Anosy',
  'Atsapandrano',
  'Bedobo',
  'Faravohitra',
  'Ilafy',
  'Lalam-baovao',
  'Lazaina',
  'Manandriana',
  'Salanitra',
  'Sabotsy',
  'Soavimasoandro',
  'Soavinimerina',
  'Antanambao',
  'Antsahatsiroa',
];

async function creerAdministrateur(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const motDePasse = process.env.ADMIN_PASSWORD;
  if (!email || !motDePasse) {
    throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env');
  }
  if (motDePasse.length < 8) {
    throw new Error('ADMIN_PASSWORD doit contenir au moins 8 caractères');
  }

  const motDePasseHash = await hacherMotDePasse(motDePasse);
  await prisma.utilisateur.upsert({
    where: { email },
    update: { motDePasseHash },
    create: { email, motDePasseHash },
  });
  console.log(`Compte administrateur prêt : ${email}`);
}

// Exemple créé seulement si aucune personne de ce rôle n'existe : on ne recrée pas ce que
// l'utilisateur a supprimé ou renommé depuis Paramètres.
async function assurerPersonne(nom: string, role: RolePersonne): Promise<void> {
  if ((await prisma.personne.count({ where: { role } })) === 0) {
    await prisma.personne.create({ data: { nom, role } });
  }
}

async function main(): Promise<void> {
  await creerAdministrateur();

  if ((await prisma.camion.count()) === 0) {
    await prisma.camion.create({ data: { immatriculation: '0000 TAA', nom: 'Camion 1' } });
  }
  await assurerPersonne('Chauffeur 1', 'CHAUFFEUR');
  await assurerPersonne('Receveur 1', 'RECEVEUR');

  for (const nom of LIEUX) {
    await prisma.lieu.upsert({ where: { nom }, update: {}, create: { nom } });
  }

  console.log(
    `Référentiels prêts (environnement ${config.NODE_ENV}) : ${LIEUX.length} lieux, camion et personnes d'exemple si la base était vide`,
  );
}

main()
  .catch((erreur: unknown) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
