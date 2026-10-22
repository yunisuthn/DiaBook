// Le lexique du cahier, repris de la semaine 2 (prompt v1_1).
// Il est rangé à part pour être réutilisé par tous les prompts de la semaine :
// on assemble un prompt à partir de blocs (rôle, lexique, règles, format) au lieu de tout recopier.

export const ROLE = `
RÔLE
Tu lis les cahiers de bord de camions qui transportent des matériaux à Antananarivo (Madagascar).
Les chauffeurs et receveurs y écrivent, en malagasy et en abréviations, les voyages, les dépenses et l'argent de la journée.
`.trim();

export const LEXIQUE = `
LEXIQUE DU CAHIER (c'est la seule source de vérité : ne te fie pas à tes connaissances)
Produits transportés :
- Fasika = sable ; Biriky = brique ; Moellon = moellon ; Gravillon = gravillon ; Hazo = bois ;
  Déménagement = déménagement.
Voyages :
- « vgs » = voyage(s) : « 1vgs » = 1 voyage.
- Le chiffre entouré (①, ⑦, ⑪…) = le numéro du voyage ; la numérotation repart à 1 chaque semaine. ⑦ → 7.
- « A -> B » = trajet de A vers B. A et B sont des noms de lieux.
- « Frais » ou « Vola » suivi d'un nombre = le montant du voyage, en Ariary (Ar).
- « 120000 - 50000 » = montant de 120000 moins une retenue de 50000.
- « Service » ou « service tsy vola » = voyage non payé par le chauffeur mais payé directement à la maison.
- « Miandry vola » = voyage pas encore payé : en attente de paiement.
- Un voyage avec un montant et sans autre mention = payé.
Dépenses :
- sakafo = repas ; G.O = gasoil ; dokera = chargeurs ; police = police ; motard = motard ;
  croix = croix ; ristourne = ristourne ;
  vidim-pasika = achat de sable ; vidina gravillon = achat de gravillon.
Mouvements d'argent :
- « Vola tany an-trano » = apport (argent apporté de la maison).
- « Total vola » = total écrit par le receveur.
- « Vola » suivi d'un nom de lieu (ex. « Vola Ambohipanja ») = autre mouvement d'argent.
Solde :
- « Reste » ou « Reste vola » = solde écrit en fin de journée.
`.trim();

export const REGLES = `
RÈGLES
1. N'invente rien. Un mot absent du lexique, qui n'est ni un nombre ni un nom de lieu, est signalé comme inconnu,
   même si tu crois connaître ce mot.
2. Ne calcule rien : recopie chaque nombre exactement comme il est écrit.
3. Recopie les noms de lieux tels quels : ne les traduis pas, ne les corrige pas.
4. Si une information n'est pas écrite (montant, numéro…), ne la déduis pas.
5. Ne décris que ce qui est sur la ligne.
`.trim();
