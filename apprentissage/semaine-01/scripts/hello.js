// Premier appel à un LLM : une question fixe, une réponse, les tokens consommés.
// Usage : npm run hello

import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';

// const QUESTION = "En une phrase, qu'est-ce qu'un «Nous avons transporté trois voyages de sable à Ambohipanja.» pour un camion de transport ?";
const QUESTION = "Sachant que «fasika» signifie «sable» en malagasy, «nitondra» signifie «transporté» et «fiara fitaterana» signifie «camion de transport», que signifie «transporter». Que veut dire «Nitondra fasika» en français ?";
try {
  const ai = creerClient();
  console.log(`→ Modèle : ${MODELE}`);
  console.log(`→ Question : ${QUESTION}\n`);

  const debut = Date.now();
  const reponse = await ai.models.generateContent({
    model: MODELE,
    contents: QUESTION,
  });

  // reponse.text rassemble le texte de la réponse.
  console.log(reponse.text);

  // usageMetadata : le « compteur » de tokens de cet appel (cf. étape 1).
  const u = reponse.usageMetadata ?? {};
  console.log('\n--- Consommation ---');
  console.log(`Entrée (prompt)    : ${u.promptTokenCount ?? 0} tokens`);
  console.log(`Sortie (réponse)   : ${u.candidatesTokenCount ?? 0} tokens`);
  console.log(`Réflexion (thinking): ${u.thoughtsTokenCount ?? 0} tokens`);
  console.log(`Durée              : ${((Date.now() - debut) / 1000).toFixed(1)} s`);
} catch (err) {
  console.error(`❌ ${expliquerErreur(err)}`);
  process.exitCode = 1;
}
