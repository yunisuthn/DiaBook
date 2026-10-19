import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { type MetaPage, SYSTEM_PROMPT, userPrompt } from './prompt.js';
import { NOM_OUTIL, outilEnregistrerPage, type PageExtraite, schemaPage } from './schema.js';

export const MODELE_PAR_DEFAUT = 'claude-opus-5-5';

/** Au-delà, la page n'est pas réessayée : l'extraction est marquée en erreur. */
const ESSAIS_VALIDATION = 2;
// La réflexion du modèle compte dans max_tokens : on laisse de la marge à la sortie JSON.
const MAX_TOKENS = 16_000;

// Capacités qui varient selon le modèle (voir la documentation de l'API Claude).
/** Refusent tool_choice forcé (400) : on passe en « auto » + strict, et le prompt demande l'outil. */
const SANS_CHOIX_FORCE = new Set([
  'claude-opus-5-5',
  'claude-sonnet-5-5',
  'claude-fable-5-1',
  'claude-mythos-5-1',
]);
/** Acceptent `strict: true` (arguments garantis conformes au schéma). */
const AVEC_STRICT = new Set([
  'claude-fable-5-1',
  'claude-mythos-5-1',
  'claude-fable-5',
  'claude-mythos-5',
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-opus-4-8',
  'claude-sonnet-5-5',
  'claude-sonnet-5',
  'claude-haiku-4-5',
]);
/** Repli automatique sur un autre modèle si la requête est refusée par un filtre de sécurité. */
const AVEC_REPLI = new Set([
  'claude-fable-5-1',
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-sonnet-5-5',
]);

export type { MetaPage };

export interface ResultatExtraction {
  page: PageExtraite;
  /** Entrée brute de l'outil, telle que renvoyée par le modèle */
  brut: unknown;
  /** Modèle qui a effectivement répondu (peut différer en cas de repli) */
  modele: string;
  dureeMs: number;
  tokensEntree: number;
  tokensSortie: number;
  /** 1, ou 2 si la première sortie était invalide */
  essais: number;
}

export type CodeErreurExtraction =
  | 'SORTIE_INVALIDE'
  | 'REFUS'
  | 'AUTHENTIFICATION'
  | 'LIMITE_DEBIT'
  | 'DELAI_DEPASSE'
  | 'RESEAU'
  | 'SERVEUR'
  | 'REQUETE_INVALIDE';

export class ErreurExtraction extends Error {
  constructor(
    message: string,
    public readonly code: CodeErreurExtraction,
    /** Ce qui a été obtenu avant l'échec, pour l'enregistrer quand même */
    public readonly details: Omit<ResultatExtraction, 'page'>,
  ) {
    super(message);
    this.name = 'ErreurExtraction';
  }
}

/**
 * Client Anthropic : timeout de 90 s par requête et 2 nouvelles tentatives (3 essais au total).
 * Le SDK réessaie de lui-même, avec backoff exponentiel et en respectant retry-after,
 * sur 429, 5xx, 408, 409 et les erreurs réseau. Clé lue dans ANTHROPIC_API_KEY.
 */
export function creerClientAnthropic(options: { apiKey?: string } = {}): Anthropic {
  return new Anthropic({ ...options, maxRetries: 2, timeout: 90_000 });
}

function traduireErreurApi(erreur: unknown): [CodeErreurExtraction, string] | null {
  // Du plus précis au plus général.
  if (erreur instanceof Anthropic.AuthenticationError)
    return ['AUTHENTIFICATION', 'Clé API Anthropic refusée (ANTHROPIC_API_KEY)'];
  if (erreur instanceof Anthropic.RateLimitError)
    return ['LIMITE_DEBIT', 'Limite de requêtes Anthropic atteinte après 3 essais'];
  if (erreur instanceof Anthropic.APIConnectionTimeoutError)
    return ['DELAI_DEPASSE', 'Pas de réponse de l’API Claude en 90 s (3 essais)'];
  if (erreur instanceof Anthropic.APIConnectionError)
    return ['RESEAU', 'API Claude injoignable (3 essais)'];
  if (erreur instanceof Anthropic.InternalServerError)
    return ['SERVEUR', `API Claude indisponible (${erreur.status}) après 3 essais`];
  if (erreur instanceof Anthropic.BadRequestError)
    return ['REQUETE_INVALIDE', `Requête refusée par l’API Claude : ${erreur.message}`];
  if (erreur instanceof Anthropic.APIError)
    return ['SERVEUR', `Erreur de l’API Claude (${erreur.status}) : ${erreur.message}`];
  return null;
}

/**
 * Lit une photo de page du cahier avec l'API Claude (vision) et renvoie son contenu structuré.
 * La sortie est validée avec Zod ; si elle est invalide, l'erreur est renvoyée au modèle pour un
 * second essai. Lève ErreurExtraction en cas d'échec définitif.
 */
export async function extrairePage(
  image: Buffer,
  meta: MetaPage = {},
  options: { client?: Anthropic; modele?: string; typeMime?: 'image/jpeg' | 'image/png' } = {},
): Promise<ResultatExtraction> {
  const client = options.client ?? creerClientAnthropic();
  const modeleDemande = options.modele ?? MODELE_PAR_DEFAUT;
  const choixForce = !SANS_CHOIX_FORCE.has(modeleDemande);

  const debut = performance.now();
  let modele = modeleDemande;
  let tokensEntree = 0;
  let tokensSortie = 0;
  let brut: unknown = null;
  let essais = 0;
  const details = () => ({
    brut,
    modele,
    dureeMs: Math.round(performance.now() - debut),
    tokensEntree,
    tokensSortie,
    essais,
  });

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: options.typeMime ?? 'image/jpeg',
            data: image.toString('base64'),
          },
        },
        { type: 'text', text: userPrompt(meta) },
      ],
    },
  ];

  let derniereErreur = '';
  while (essais < ESSAIS_VALIDATION) {
    essais += 1;
    let reponse: Anthropic.Beta.BetaMessage;
    try {
      reponse = await client.beta.messages.create({
        model: modeleDemande,
        max_tokens: MAX_TOKENS,
        // Prompt et outil identiques pour toutes les photos : mis en cache s'ils sont assez longs.
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        tools: [
          { ...outilEnregistrerPage, ...(AVEC_STRICT.has(modeleDemande) ? { strict: true } : {}) },
        ],
        tool_choice: choixForce
          ? { type: 'tool', name: NOM_OUTIL }
          : { type: 'auto', disable_parallel_tool_use: true },
        // Copie : la liste est complétée ensuite pour le second essai.
        messages: [...messages],
        ...(AVEC_REPLI.has(modeleDemande)
          ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
          : {}),
      });
    } catch (erreur) {
      const traduction = traduireErreurApi(erreur);
      if (!traduction) throw erreur;
      throw new ErreurExtraction(traduction[1], traduction[0], details());
    }

    modele = reponse.model;
    tokensEntree +=
      reponse.usage.input_tokens +
      (reponse.usage.cache_creation_input_tokens ?? 0) +
      (reponse.usage.cache_read_input_tokens ?? 0);
    tokensSortie += reponse.usage.output_tokens;

    if (reponse.stop_reason === 'refusal') {
      throw new ErreurExtraction(
        `Lecture refusée par le modèle${reponse.stop_details?.category ? ` (${reponse.stop_details.category})` : ''}`,
        'REFUS',
        details(),
      );
    }

    const appel = reponse.content.find(
      (bloc): bloc is Anthropic.Beta.BetaToolUseBlock =>
        bloc.type === 'tool_use' && bloc.name === NOM_OUTIL,
    );
    if (appel) {
      brut = appel.input;
      const validation = schemaPage.safeParse(appel.input);
      if (validation.success) return { page: validation.data, ...details() };
      derniereErreur = z.prettifyError(validation.error);
    } else {
      derniereErreur =
        reponse.stop_reason === 'max_tokens'
          ? 'Réponse coupée avant la fin (max_tokens)'
          : `L’outil ${NOM_OUTIL} n’a pas été appelé`;
    }

    // Second essai : on renvoie la réponse telle quelle, puis l'erreur à corriger.
    messages.push({ role: 'assistant', content: reponse.content });
    messages.push({
      role: 'user',
      content: appel
        ? [
            {
              type: 'tool_result',
              tool_use_id: appel.id,
              is_error: true,
              content: `Données invalides :\n${derniereErreur}\nCorrige-les et appelle de nouveau ${NOM_OUTIL}.`,
            },
          ]
        : [
            {
              type: 'text',
              text: `${derniereErreur}. Appelle l’outil ${NOM_OUTIL} avec le contenu de la photo.`,
            },
          ],
    });
  }

  throw new ErreurExtraction(
    `Sortie invalide après ${ESSAIS_VALIDATION} essais : ${derniereErreur}`,
    'SORTIE_INVALIDE',
    details(),
  );
}
