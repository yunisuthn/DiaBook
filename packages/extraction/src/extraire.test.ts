import Anthropic from '@anthropic-ai/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { creerClientAnthropic, ErreurExtraction, extrairePage } from './extraire.js';
import { NOM_OUTIL, type PageExtraite } from './schema.js';

const PAGE: PageExtraite = {
  qualite_photo: { lisibilite: 'bonne', problemes: [] },
  journees: [
    {
      date: '2026-10-01',
      date_ecrite: '01-10-26',
      debut_coupe: false,
      fin_coupee: false,
      voyages: [
        {
          numero: 11,
          produit: 'sable',
          produit_brut: 'Fasika',
          quantite: 1,
          unite: 'voyage',
          origine: 'Lalam-baovao',
          destination: 'Ambohitrimanjaka',
          montant: 60000,
          retenue: null,
          statut: 'paye',
          texte_brut: '* Fasika 1vgs ⑪ Lalam-baovao -> Ambohitrimanjaka Frais 60000Ar',
          confiance: 0.9,
        },
      ],
      depenses: [{ categorie: 'repas', libelle_brut: 'Sakafo', montant: 10000, confiance: 0.9 }],
      mouvements: [],
      solde_ecrit: 50000,
    },
  ],
  remarques: [],
};

type Contenu = Record<string, unknown>[];

function reponse(
  contenu: Contenu,
  {
    stop_reason = 'tool_use',
    model = 'claude-opus-5-5',
  }: { stop_reason?: string; model?: string } = {},
) {
  return {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model,
    content: contenu,
    stop_reason,
    stop_details: stop_reason === 'refusal' ? { type: 'refusal', category: 'cyber' } : null,
    usage: {
      input_tokens: 1000,
      output_tokens: 400,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 200,
    },
  };
}

const appelOutil = (input: unknown, id = 'toolu_1') => ({
  type: 'tool_use',
  id,
  name: NOM_OUTIL,
  input,
});

const create = vi.fn();
const client = { beta: { messages: { create } } } as unknown as Anthropic;
const IMAGE = Buffer.from('jpeg');

interface Requete {
  model: string;
  tool_choice: { type: string; name?: string };
  tools: { strict?: boolean }[];
  betas?: string[];
  fallbacks?: unknown;
  messages: { role: string; content: Contenu }[];
}
const requete = (index: number) => create.mock.calls[index]?.[0] as Requete;

beforeEach(() => {
  create.mockReset();
});

describe('extrairePage', () => {
  it('envoie la photo en base64 avec le contexte, et renvoie la page validée', async () => {
    create.mockResolvedValueOnce(reponse([appelOutil(PAGE)]));

    const resultat = await extrairePage(
      IMAGE,
      { camion: '1234 TBA', datePrecedente: '2026-09-30' },
      { client },
    );

    expect(resultat.page).toEqual(PAGE);
    expect(resultat).toMatchObject({
      modele: 'claude-opus-5-5',
      essais: 1,
      tokensEntree: 1200,
      tokensSortie: 400,
    });
    const [message] = requete(0).messages;
    expect(message?.content[0]).toMatchObject({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: IMAGE.toString('base64') },
    });
    expect(message?.content[1]).toMatchObject({
      text: expect.stringContaining(
        'Camion : 1234 TBA. La dernière date connue avant cette page est 2026-09-30.',
      ),
    });
  });

  it('sur Opus 5.5 : pas de tool_choice forcé (refusé par le modèle), mode strict et repli activés', async () => {
    create.mockResolvedValueOnce(reponse([appelOutil(PAGE)]));
    await extrairePage(IMAGE, {}, { client, modele: 'claude-opus-5-5' });
    expect(requete(0)).toMatchObject({
      tool_choice: { type: 'auto' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    expect(requete(0).tools[0]?.strict).toBe(true);
  });

  it('force l’outil sur les modèles qui l’acceptent', async () => {
    create.mockResolvedValueOnce(reponse([appelOutil(PAGE)], { model: 'claude-opus-4-8' }));
    await extrairePage(IMAGE, {}, { client, modele: 'claude-opus-4-8' });
    expect(requete(0).tool_choice).toEqual({ type: 'tool', name: NOM_OUTIL });
    expect(requete(0).fallbacks).toBeUndefined();
  });

  it('renvoie l’erreur de validation au modèle et accepte la correction', async () => {
    const invalide = { ...PAGE, journees: [{ ...PAGE.journees[0], debut_coupe: 'non' }] };
    create
      .mockResolvedValueOnce(
        reponse([{ type: 'thinking', thinking: '', signature: 's' }, appelOutil(invalide)]),
      )
      .mockResolvedValueOnce(reponse([appelOutil(PAGE, 'toolu_2')]));

    const resultat = await extrairePage(IMAGE, {}, { client });

    expect(resultat.essais).toBe(2);
    expect(resultat.tokensEntree).toBe(2400);
    const messages = requete(1).messages;
    expect(messages).toHaveLength(3);
    // La réponse précédente est renvoyée telle quelle (bloc de réflexion compris).
    expect(messages[1]?.content[0]).toMatchObject({ type: 'thinking' });
    expect(messages[2]?.content[0]).toMatchObject({
      type: 'tool_result',
      tool_use_id: 'toolu_1',
      is_error: true,
      content: expect.stringContaining('debut_coupe'),
    });
  });

  it('relance quand l’outil n’a pas été appelé, puis échoue si cela se reproduit', async () => {
    create.mockResolvedValue(
      reponse([{ type: 'text', text: 'Voici la page…' }], { stop_reason: 'end_turn' }),
    );

    const erreur = await extrairePage(IMAGE, {}, { client }).catch((e: unknown) => e);

    expect(erreur).toBeInstanceOf(ErreurExtraction);
    expect(erreur).toMatchObject({ code: 'SORTIE_INVALIDE', details: { essais: 2, brut: null } });
    expect(create).toHaveBeenCalledTimes(2);
    expect(requete(1).messages[2]?.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(NOM_OUTIL),
    });
  });

  it('garde la sortie brute quand la seconde sortie est encore invalide', async () => {
    const invalide = { ...PAGE, remarques: 'pas un tableau' };
    create.mockResolvedValue(reponse([appelOutil(invalide)]));
    const erreur = await extrairePage(IMAGE, {}, { client }).catch((e: unknown) => e);
    expect(erreur).toMatchObject({
      code: 'SORTIE_INVALIDE',
      details: { brut: invalide, tokensSortie: 800 },
    });
  });

  it('ne réessaie pas un refus du modèle', async () => {
    create.mockResolvedValueOnce(reponse([], { stop_reason: 'refusal' }));
    const erreur = await extrairePage(IMAGE, {}, { client }).catch((e: unknown) => e);
    expect(erreur).toMatchObject({ code: 'REFUS', message: expect.stringContaining('cyber') });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      new Anthropic.RateLimitError(429, undefined, 'trop de requêtes', new Headers()),
      'LIMITE_DEBIT',
    ],
    [new Anthropic.InternalServerError(529, undefined, 'surchargé', new Headers()), 'SERVEUR'],
    [
      new Anthropic.AuthenticationError(401, undefined, 'clé invalide', new Headers()),
      'AUTHENTIFICATION',
    ],
    [new Anthropic.APIConnectionTimeoutError(), 'DELAI_DEPASSE'],
    [new Anthropic.APIConnectionError({ message: 'réseau' }), 'RESEAU'],
  ])('traduit les erreurs de l’API (%s)', async (erreurApi, code) => {
    create.mockRejectedValueOnce(erreurApi);
    await expect(extrairePage(IMAGE, {}, { client })).rejects.toMatchObject({ code });
  });
});

describe('creerClientAnthropic', () => {
  it('3 essais au total (2 nouvelles tentatives du SDK) et 90 s par requête', () => {
    const anthropic = creerClientAnthropic({ apiKey: 'cle-de-test' });
    expect(anthropic.maxRetries).toBe(2);
    expect(anthropic.timeout).toBe(90_000);
  });
});
