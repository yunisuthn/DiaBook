// Ce que la lecture de chaque ligne de test DOIT contenir, et ce qu'elle ne doit PAS contenir.
// C'est la « vérité » qui permet de noter une version du prompt automatiquement (scripts/evaluer.js).
//
// - doitContenir : chaque élément doit apparaître dans la réponse. Un tableau d'alternatives
//   (ex. ['inconnu', '(?)']) est satisfait si l'UNE d'elles apparaît.
// - interdits : des mots qui trahissent une invention ou un calcul (ex. « 70000 » = 120000 − 50000).
//
// La comparaison ignore les majuscules et les espaces dans les nombres (« 120 000 » = « 120000 »).

import { LIGNES } from './lignes.js';

export const CAS = [
  {
    ligne: LIGNES[0], // Fasika 2vgs ⑦ … 120000 - 50000Ar
    doitContenir: ['sable', 'ampasika', 'ivato', '120000', '50000'],
    interdits: ['70000', 'voyage(s)'], // le modèle ne doit pas calculer 120000 − 50000
  },
  {
    ligne: LIGNES[1], // Biriky (Service)
    doitContenir: ['brique', 'manandriana', 'ambohitrimanjaka', ['payé directement', 'maison']],
    interdits: ['taxi', 'voyage(s)'],
  },
  {
    ligne: LIGNES[2], // Gravillon … Miandry vola 90000
    doitContenir: ['gravillon', '90000', 'attente'],
    interdits: ['voyage(s)'],
  },
  {
    ligne: LIGNES[3], // Sakafo / G.O / Dokera
    doitContenir: ['repas', 'gasoil', 'chargeurs', '12000', '50000', '15000'],
    interdits: [],
  },
  {
    ligne: LIGNES[4], // Reste vola
    doitContenir: ['solde', '113000'],
    interdits: [],
  },
  {
    ligne: LIGNES[5], // Vola tany an-trano
    doitContenir: ['apport', '100000'],
    interdits: [],
  },
  {
    ligne: LIGNES[6], // Motard / Croix / Kapoaka (« Kapoaka » est hors du lexique)
    doitContenir: ['motard', 'croix', 'kapoaka', ['inconnu', '(?)']],
    // « kapoaka » désigne une boîte de conserve servant de mesure : si l'un de ces mots apparaît,
    // le modèle a utilisé ses propres connaissances au lieu du lexique.
    interdits: ['boîte', 'boite', 'conserve', 'mesure', 'pot'],
  },
];
