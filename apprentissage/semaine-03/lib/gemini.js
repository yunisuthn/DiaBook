// Tout ce qui concerne Gemini est regroupé ici.
// Les scripts (et plus tard le serveur Express) n'importent que ce fichier :
// pour changer de fournisseur (Claude, Ollama…), c'est le seul endroit à modifier.

import { GoogleGenAI, ApiError } from '@google/genai';

// --- 1. Lire le fichier .env ------------------------------------------------
// process.loadEnvFile() est intégré à Node (≥ 21.7) : pas besoin du paquet dotenv.
// On construit le chemin à partir de CE fichier, pour que ça marche
// quel que soit le dossier depuis lequel on lance la commande.
const cheminEnv = new URL('../.env', import.meta.url);
try {
  process.loadEnvFile(cheminEnv);
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
  // Pas de .env : on laisse continuer, creerClient() expliquera quoi faire.
}

export const MODELE = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 30_000;

// --- 2. Créer le client ---------------------------------------------------------
export function creerClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ErreurConfig(
      'Clé API manquante.\n' +
        '  1. Copie le modèle :   cp .env.example .env\n' +
        '  2. Colle ta clé AI Studio après GEMINI_API_KEY= dans le fichier .env',
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      // Au-delà de ce délai (par tentative), la requête est abandonnée.
      timeout: TIMEOUT_MS,
      // Le SDK sait réessayer tout seul : inutile de réécrire cette logique.
      // 429 = trop de requêtes, 500/503 = serveur surchargé ou en panne,
      // 504 = le serveur de Google n'a pas fini à temps.
      // Délais : 2 s, puis 4 s (le délai double à chaque essai).
      retryOptions: { attempts: 3, initialDelay: 2, httpStatusCodes: [429, 500, 503, 504] },
    },
  });
}

// Erreur « de notre faute » (configuration), pour la distinguer des erreurs d'API.
export class ErreurConfig extends Error {}

// --- 3. Traduire une erreur en message compréhensible ----------------------------
export function expliquerErreur(err) {
  if (err instanceof ErreurConfig) return err.message;

  // Erreur renvoyée par l'API Google : elle a un code HTTP (err.status).
  if (err instanceof ApiError) {
    const detail = lireDetailGoogle(err);
    switch (err.status) {
      case 400:
        if (detail.raison === 'API_KEY_INVALID') {
          return "Clé API invalide : vérifie GEMINI_API_KEY dans le fichier .env (pas d'espace, pas de guillemets).";
        }
        return `Requête refusée (400) : ${detail.message}`;
      case 403:
        return "Accès refusé (403) : la clé n'a pas le droit d'utiliser ce modèle ou ce service.";
      case 404:
        return `Modèle introuvable (404) : « ${MODELE} » n'existe pas. Lance « npm run models » pour voir la liste.`;
      case 429:
        return (
          "Limite atteinte (429) : trop de requêtes pour l'offre gratuite, même après 3 essais.\n" +
          '  Attends une minute (limite par minute) ou demain (limite par jour).\n' +
          `  Détail Google : ${detail.message}`
        );
      case 500:
      case 503:
        return `Le service Google est surchargé ou indisponible (${err.status}). Réessaie dans quelques minutes.`;
      case 504:
        return (
          "Délai dépassé côté Google (504) : leur serveur n'a pas terminé à temps, même après 3 essais.\n" +
          '  Souvent une surcharge passagère : réessaie, ou choisis un modèle plus léger dans GEMINI_MODEL.'
        );
      default:
        return `Erreur de l'API (${err.status}) : ${detail.message}`;
    }
  }

  // Le délai TIMEOUT_MS est dépassé : le SDK a annulé la requête.
  if (err.name === 'AbortError') {
    return `Pas de réponse au bout de ${TIMEOUT_MS / 1000} s (timeout). Réessaie, ou augmente GEMINI_TIMEOUT_MS dans .env.`;
  }

  // fetch() n'a même pas pu joindre le serveur : souvent pas d'Internet.
  if (err instanceof TypeError && err.message === 'fetch failed') {
    return `Impossible de joindre Google (${err.cause?.code ?? 'réseau'}) : vérifie ta connexion Internet.`;
  }

  // Cas imprévu : on affiche l'erreur brute pour pouvoir la comprendre.
  return `Erreur inattendue : ${err.stack ?? err}`;
}

// --- 4. Choisir le code HTTP que NOTRE serveur renverra pour cette erreur ----------
// 429 est transmis tel quel (le client doit attendre). Une autre erreur de Google
// devient 502 « Bad Gateway » : c'est le service derrière nous qui a échoué.
// Le reste (config, bug) est une erreur de notre serveur : 500.
export function statutHttp(err) {
  if (err instanceof ApiError) return err.status === 429 ? 429 : 502;
  if (err.name === 'AbortError') return 504; // Google n'a pas répondu à temps
  if (err instanceof TypeError && err.message === 'fetch failed') return 502; // Google injoignable
  return 500;
}

// Le message d'une ApiError est le JSON renvoyé par Google :
// {"error":{"code":400,"message":"...","status":"INVALID_ARGUMENT","details":[...]}}
function lireDetailGoogle(err) {
  try {
    const { error } = JSON.parse(err.message);
    const raison = error.details?.find((d) => d.reason)?.reason;
    return { message: error.message, raison };
  } catch {
    return { message: err.message };
  }
}
