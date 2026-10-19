// Fidélité au prototype cahier-extract/ : même schéma, même prompt, même normalisation des lieux.
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { normaliserLieu } from './lieux.js';
import { SYSTEM_PROMPT, userPrompt } from './prompt.js';
import { schemaJsonPage, schemaPage } from './schema.js';

const RACINE_PROTOTYPE = new URL('../../../cahier-extract/', import.meta.url);
// Les extractions réelles (out/) ne sont pas dans le dépôt public : le test est ignoré sans elles.
const DOSSIER_EXTRACTIONS = new URL('out/', RACINE_PROTOTYPE);
const AVEC_EXTRACTIONS_REELLES = existsSync(DOSSIER_EXTRACTIONS);

// Chemin non littéral : TypeScript ne cherche pas les types de ces fichiers JavaScript.
async function importerPrototype<T>(fichier: string): Promise<T> {
  return (await import(new URL(`src/${fichier}`, RACINE_PROTOTYPE).href)) as T;
}

type Noeud = Record<string, unknown>;

/** Forme comparable d'un JSON Schema : types triés (anyOf ou tableau de types), propriétés, required. */
function canonique(noeud: Noeud): unknown {
  const types = new Set<string>();
  const variantes = (noeud.anyOf as Noeud[] | undefined) ?? [noeud];
  for (const variante of variantes) {
    const type = variante.type;
    for (const t of Array.isArray(type) ? type : [type]) if (t) types.add(String(t));
  }
  const principal = variantes.find((v) => v.type !== 'null') ?? noeud;
  const proprietes = principal.properties as Record<string, Noeud> | undefined;
  return {
    types: [...types].sort(),
    description: noeud.description ?? principal.description ?? null,
    enum: principal.enum ?? null,
    required: principal.required ? [...(principal.required as string[])].sort() : null,
    items: principal.items ? canonique(principal.items as Noeud) : null,
    properties: proprietes
      ? Object.fromEntries(
          Object.entries(proprietes)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cle, valeur]) => [cle, canonique(valeur)]),
        )
      : null,
  };
}

describe('fidélité au prototype', () => {
  it('le schéma de l’outil décrit exactement la même structure que schema.js', async () => {
    const { pageSchema } = await importerPrototype<{ pageSchema: Noeud }>('schema.js');
    expect(canonique(schemaJsonPage)).toEqual(canonique(pageSchema));
  });

  it('le prompt système et le message utilisateur sont identiques', async () => {
    const prototype = await importerPrototype<{
      SYSTEM_PROMPT: string;
      userPrompt: (meta?: object) => string;
    }>('prompt.js');
    expect(SYSTEM_PROMPT).toBe(prototype.SYSTEM_PROMPT);
    for (const meta of [
      {},
      { camion: '1234 TBA' },
      { camion: '1234 TBA', datePrecedente: '2026-10-01' },
    ]) {
      expect(userPrompt(meta)).toBe(prototype.userPrompt(meta));
    }
  });

  it('normalise les lieux comme lieux.js', async () => {
    const prototype = await importerPrototype<{ normaliserLieu: (brut: unknown) => unknown }>(
      'lieux.js',
    );
    for (const brut of [
      'Lalam-baovao',
      'Antamety',
      'Anbadikely',
      'Soavimasoandro (?)',
      'ilafy',
      'Mpanao Ramique',
      '',
      null,
    ]) {
      expect(normaliserLieu(brut)).toEqual(prototype.normaliserLieu(brut));
    }
  });

  it.skipIf(!AVEC_EXTRACTIONS_REELLES)(
    'le schéma Zod accepte les 7 extractions réelles de out/',
    async () => {
      const dossier = DOSSIER_EXTRACTIONS;
      const fichiers = (await readdir(dossier)).filter((nom) => nom.endsWith('.json'));
      expect(fichiers).toHaveLength(7);
      for (const nom of fichiers) {
        const page: unknown = JSON.parse(await readFile(new URL(nom, dossier), 'utf8'));
        const resultat = schemaPage.safeParse(page);
        expect(resultat.success, `${nom} : ${resultat.error?.message}`).toBe(true);
      }
    },
  );
});

describe('schéma de l’outil (mode strict)', () => {
  it('ferme tous les objets et retire les bornes non prises en charge', () => {
    const texte = JSON.stringify(schemaJsonPage);
    expect(texte).not.toMatch(/"(minimum|maximum|\$schema)"/);
    const verifier = (noeud: unknown): void => {
      if (Array.isArray(noeud)) return noeud.forEach(verifier);
      if (noeud === null || typeof noeud !== 'object') return;
      const objet = noeud as Noeud;
      if (objet.type === 'object') expect(objet.additionalProperties).toBe(false);
      expect(Array.isArray(objet.type)).toBe(false);
      Object.values(objet).forEach(verifier);
    };
    verifier(schemaJsonPage);
  });
});
