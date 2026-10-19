// Serveur Express : reçoit une question, la transmet à Gemini,
// et renvoie la réponse AU FUR ET À MESURE au navigateur (Server-Sent Events).
//
// Lancement : npm run dev     (développement, avec Vite)  ou  npm start  (production)

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { creerClient, expliquerErreur, statutHttp, MODELE } from '../../lib/gemini.js';

const PORT = Number(process.env.PORT) || 3100;
const PROMPT_MAX = 4000; // caractères : une limite simple pour ne pas exploser le quota

// Dossier produit par « npm run build -w client » (la page React compilée).
const DOSSIER_PAGE = fileURLToPath(new URL('../../client/dist', import.meta.url));
const PAGE_COMPILEE = existsSync(DOSSIER_PAGE);

const app = express();
app.use(express.json({ limit: '50kb' }));

// Petite route pour vérifier que le serveur tourne : curl localhost:3100/api/health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, modele: MODELE });
});

app.post('/api/ai', async (req, res) => {
  // --- 1. Valider l'entrée : ne jamais faire confiance à ce qu'envoie le navigateur ---
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt) {
    return res.status(400).json({ erreur: 'Le champ « prompt » est obligatoire.' });
  }
  if (prompt.length > PROMPT_MAX) {
    return res.status(400).json({ erreur: `Prompt trop long (max ${PROMPT_MAX} caractères).` });
  }

  // --- 2. Si le navigateur se déconnecte (bouton « Stop », onglet fermé), on annule ---
  // Sinon Gemini continuerait à générer (et à consommer du quota) pour personne.
  const annulation = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) annulation.abort();
  });

  // --- 3. Démarrer la génération AVANT d'envoyer les en-têtes ---
  // Si Google refuse (clé invalide, quota…), on peut encore répondre avec un vrai
  // code HTTP d'erreur. Une fois le statut 200 envoyé, ce ne sera plus possible.
  let flux;
  try {
    flux = await creerClient().models.generateContentStream({
      model: MODELE,
      contents: prompt,
      config: { abortSignal: annulation.signal },
    });
  } catch (err) {
    if (annulation.signal.aborted) {
      console.log('[api/ai] client parti avant le début de la réponse');
      return;
    }
    console.error('[api/ai] échec au démarrage :', err.message);
    return res.status(statutHttp(err)).json({ erreur: expliquerErreur(err) });
  }

  // --- 4. Ouvrir le flux SSE ---
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform', // pas de mise en cache ni de compression
    Connection: 'keep-alive',
  });

  // Format SSE : un bloc par événement, terminé par une ligne vide.
  //   event: texte
  //   data: {"texte":"Bonjour"}
  //   (ligne vide)
  const envoyer = (evenement, donnees) => {
    res.write(`event: ${evenement}\ndata: ${JSON.stringify(donnees)}\n\n`);
  };

  // --- 5. Relayer chaque morceau de Gemini vers le navigateur ---
  try {
    let usage = {};
    for await (const morceau of flux) {
      if (morceau.text) envoyer('texte', { texte: morceau.text });
      if (morceau.usageMetadata) usage = morceau.usageMetadata;
    }
    envoyer('fin', {
      modele: MODELE,
      entree: usage.promptTokenCount ?? 0,
      sortie: usage.candidatesTokenCount ?? 0,
      reflexion: usage.thoughtsTokenCount ?? 0,
    });
  } catch (err) {
    if (annulation.signal.aborted) {
      console.log('[api/ai] génération arrêtée par le client');
      return;
    }
    // Erreur en plein milieu : le statut 200 est déjà parti, on prévient par un événement.
    console.error('[api/ai] erreur pendant le flux :', err.message);
    envoyer('erreur', { message: expliquerErreur(err) });
  } finally {
    res.end();
  }
});

// --- Production : Express sert aussi la page React compilée ---
// En développement, c'est Vite qui sert la page (port 5180) et ce bloc est ignoré.
if (PAGE_COMPILEE) {
  app.use(express.static(DOSSIER_PAGE));
  // Toute autre adresse (hors /api) renvoie index.html : c'est React qui gère l'affichage.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile('index.html', { root: DOSSIER_PAGE });
  });
}

// Route /api inconnue : 404 en JSON.
app.use('/api', (req, res) => {
  res.status(404).json({ erreur: `Route inconnue : ${req.method} ${req.originalUrl}` });
});

// JSON mal formé dans la requête, ou autre erreur imprévue : réponse JSON, pas une page HTML.
app.use((err, req, res, _next) => {
  const statut = err.status ?? 500;
  res.status(statut).json({ erreur: statut === 400 ? 'Corps JSON invalide.' : 'Erreur interne.' });
});

// Avec Express 5, une erreur de démarrage (ex. port déjà pris) arrive dans ce callback.
app.listen(PORT, (err) => {
  if (err) {
    console.error(
      err.code === 'EADDRINUSE'
        ? `❌ Le port ${PORT} est déjà utilisé : un autre serveur tourne déjà (regarde tes autres terminaux).`
        : `❌ Impossible de démarrer : ${err.message}`,
    );
    process.exit(1);
  }
  console.log(`API prête sur http://localhost:${PORT} (modèle : ${MODELE})`);
  if (PAGE_COMPILEE) console.log(`Page React compilée servie sur http://localhost:${PORT}`);
});
