// 10 journées INVENTÉES, écrites dans le style du cahier (une page = une journée).
// Elles se suivent : la numérotation des voyages continue d'un jour à l'autre et repart à 1 le lundi 5 octobre.
//
// « attendu » : ce que la lecture doit trouver. Il servira à vérifier l'extraction (étape 5)
// et, en semaine 5, les règles de calcul :
//   solde = Σ (montant − retenue) des voyages payés + apports − Σ dépenses

export const JOURNEES = [
  {
    id: 'J01',
    texte: `28-09-26
* Fasika 1vgs ① Ampasika -> Ivato Frais 80000
* Biriky 1vgs (Service) ② Manandriana -> Ambohitrimanjaka
* Fasika 2vgs ③ Ampasika -> Talatamaty Frais 160000
Sakafo 12000 / Dokera 15000
Reste vola 213000`,
    // 80000 + 160000 − 27000 = 213000
    attendu: { date: '2026-09-28', voyages: 3, depenses: 2, reste: 213000 },
  },
  {
    id: 'J02',
    texte: `29-09-26
* Gravillon 1vgs ④ Ambohipanja -> Ankadikely Frais 120000 - 50000
* Fasika 1vgs ⑤ Ampasika -> Ivato Frais 70000
* Moellon 1vgs ⑥ Ambohidratrimo -> Anosy Miandry vola 90000
Sakafo 10000 / Police 10000 / G.O 50000
Reste 70000`,
    // (120000 − 50000) + 70000 − 70000 = 70000 ; le voyage en attente ne compte pas
    attendu: { date: '2026-09-29', voyages: 3, depenses: 3, reste: 70000 },
  },
  {
    id: 'J03',
    texte: `30/09/26
Vola tany an-trano 100000
* Hazo 1vgs ⑦ Andoharanofotsy -> Itaosy Vola 90000
* Fasika 1vgs ⑧ Ampasika -> Ivato Frais 70000
G.O 150000 / Sakafo 12000 / Motard 5000
Reste vola 93000`,
    // 160000 + 100000 (apport) − 167000 = 93000
    attendu: { date: '2026-09-30', voyages: 2, depenses: 3, reste: 93000 },
  },
  {
    id: 'J04',
    texte: `01-10-26
* Biriky 2vgs ⑨ Manandriana -> Ambohimanarina Frais 180000
* Fasika 1vgs service tsy vola ⑩ Ampasika -> Ankorondrano
Sakafo 12000 / Croix 2000 / Kapoaka 3000
Reste vola 163000`,
    // 180000 − 14000 − 3000 (Kapoaka, compté comme une dépense par le receveur) = 163000.
    // Kapoaka est hors lexique : il doit être signalé, pas deviné.
    attendu: { date: '2026-10-01', voyages: 2, depenses: 2, reste: 163000 },
  },
  {
    id: 'J05',
    texte: `* Gravillon 1vgs ⑪ Ambohipanja -> Ivato Frais 130000
* Fasika 1vgs ⑫ Ampasika -> Anosy Frais 75000
Sakafo 10000 / Dokera 15000 / Ristourne 5000
Reste vola 175000`,
    // Pas de date écrite sur la page : la date doit rester null (ne pas la deviner).
    attendu: { date: null, voyages: 2, depenses: 3, reste: 175000 },
  },
  {
    id: 'J06',
    texte: `Asabotsy 03-10-26
* Fasika 2vgs ⑬ Ampasika -> Ivato Frais 150000
Vidim-pasika 60000 / G.O 40000 / Sakafo 12000
Reste vola 38000`,
    // « Asabotsy » = samedi (hors lexique). 150000 − 112000 = 38000
    attendu: { date: '2026-10-03', voyages: 1, depenses: 3, reste: 38000 },
  },
  {
    id: 'J07',
    texte: `05-10-26
* Biriky 1vgs ① Manandriana -> Itaosy Frais 95000
* Moellon 1vgs ② Ambohidratrimo -> Anosy Frais 85000 - 15000
* Fasika 1vgs ③ Ampasika -> Ivato Miandry vola 70000
Sakafo 12000 / Police 5000
Total vola 165000
Reste vola 148000`,
    // Nouvelle semaine : la numérotation repart à 1. 95000 + 70000 = 165000 (Total vola) − 17000 = 148000
    attendu: { date: '2026-10-05', voyages: 3, depenses: 2, reste: 148000 },
  },
  {
    id: 'J08',
    texte: `06-10-26
* Déménagement 1vgs ④ Analakely -> Ambohimanarina Vola 200000
* Fasika 1vgs ⑤ Ampasika -> Ivato Frais 70000
Vola Ambohipanja 50000
G.O 60000 / Sakafo 12000 / Dokera 20000
Reste vola 178000`,
    // « Vola Ambohipanja » = autre mouvement, hors caisse. 270000 − 92000 = 178000
    attendu: { date: '2026-10-06', voyages: 2, depenses: 3, reste: 178000 },
  },
  {
    id: 'J09',
    texte: `07-10-26
* Gravillon 1vgs ⑥ Ambohipanja -> Talatamaty Frais 140000
Vidina gravillon 70000
* Hazo 1vgs ⑦ Andoharanofotsy -> Ivato Vola 100000 - 20000
Sakafo 12000 / Motard 5000
Reste 133000`,
    // 140000 + 80000 − 87000 = 133000 ; une dépense est écrite entre deux voyages
    attendu: { date: '2026-10-07', voyages: 2, depenses: 3, reste: 133000 },
  },
  {
    id: 'J10',
    texte: `08-10-26
* Fasika 1vgs ⑧ Ampasika -> Ivato Frais 70000
* Biriky 1vgs (Service) ⑨ Manandriana -> Ambohitrimanjaka
* Gravillon 1vgs ⑩ Ambohipanja -> Ankadikely Frais 120000
Sakafo 12000 / G.O 50000
Reste vola 138000`,
    // ERREUR VOLONTAIRE du receveur : 190000 − 62000 = 128000, mais il a écrit 138000.
    // La lecture doit recopier 138000 (on lit, on ne corrige pas) ; l'écart sera détecté en semaine 5.
    attendu: { date: '2026-10-08', voyages: 3, depenses: 2, reste: 138000 },
  },
  {
    id: 'J11',
    texte: `09-10-26
* Fasika 1vgs ⑪ Ampasika -> Ivato Frais 90000 - 20000
* Moellon 1vgs ⑫ Ambohidratrimo -> Anosy Frais 85000
Sakafo 12000 / G.O 45000 / Police 5000
Reste vola 93000`,
    // (90000 − 20000) + 85000 − (12000 + 45000 + 5000) = 155000 − 62000 = 93000
    attendu: { date: '2026-10-09', voyages: 2, depenses: 3, reste: 93000 },
  },
];
