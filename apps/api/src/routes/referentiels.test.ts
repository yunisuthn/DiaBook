import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { creerApp } from '../app.js';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { NOM_COOKIE_SESSION, signerSession } from '../lib/session.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    camion: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    personne: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

const camion = vi.mocked(prisma.camion);
const personne = vi.mocked(prisma.personne);
const app = creerApp();
const cookie = `${NOM_COOKIE_SESSION}=${signerSession({ sub: 'u1', email: 'admin@diabook.local' })}`;
const ID = '6f1c2a3e-1b2c-4d5e-8f90-123456789abc';

function erreurPrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`erreur ${code}`, {
    code,
    clientVersion: 'test',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('/api/camions', () => {
  it('exige une session', async () => {
    const res = await request(app).get('/api/camions');
    expect(res.status).toBe(401);
  });

  it('liste les camions', async () => {
    camion.findMany.mockResolvedValue([{ id: ID, immatriculation: '1234 TBA' }] as never);
    const res = await request(app).get('/api/camions').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.camions).toHaveLength(1);
  });

  it('crée un camion en normalisant l’immatriculation, actif par défaut', async () => {
    camion.create.mockImplementation((async ({ data }: { data: object }) => ({
      id: ID,
      ...data,
    })) as never);
    const res = await request(app)
      .post('/api/camions')
      .set('Cookie', cookie)
      .send({ immatriculation: ' 1234   tba ', nom: ' Camion bleu ' });
    expect(res.status).toBe(201);
    expect(camion.create).toHaveBeenCalledWith({
      data: { immatriculation: '1234 TBA', nom: 'Camion bleu', actif: true },
    });
  });

  it('refuse un camion sans nom', async () => {
    const res = await request(app)
      .post('/api/camions')
      .set('Cookie', cookie)
      .send({ immatriculation: '1234 TBA', nom: '' });
    expect(res.status).toBe(400);
    expect(res.body.erreur.code).toBe('DONNEES_INVALIDES');
    expect(camion.create).not.toHaveBeenCalled();
  });

  it('signale une immatriculation déjà prise', async () => {
    camion.create.mockRejectedValue(erreurPrisma('P2002'));
    const res = await request(app)
      .post('/api/camions')
      .set('Cookie', cookie)
      .send({ immatriculation: '1234 TBA', nom: 'Camion 1' });
    expect(res.status).toBe(409);
    expect(res.body.erreur).toEqual({
      code: 'DEJA_EXISTANT',
      message: 'Un camion porte déjà l’immatriculation 1234 TBA',
    });
  });

  it('ne modifie que les champs envoyés (ne réactive pas un camion désactivé)', async () => {
    camion.update.mockResolvedValue({ id: ID } as never);
    const res = await request(app)
      .patch(`/api/camions/${ID}`)
      .set('Cookie', cookie)
      .send({ nom: 'Nouveau nom' });
    expect(res.status).toBe(200);
    expect(camion.update).toHaveBeenCalledWith({ where: { id: ID }, data: { nom: 'Nouveau nom' } });
  });

  it('refuse un identifiant mal formé', async () => {
    const res = await request(app)
      .patch('/api/camions/abc')
      .set('Cookie', cookie)
      .send({ nom: 'x' });
    expect(res.status).toBe(400);
  });

  it('renvoie 404 pour un camion introuvable', async () => {
    camion.update.mockRejectedValue(erreurPrisma('P2025'));
    const res = await request(app)
      .patch(`/api/camions/${ID}`)
      .set('Cookie', cookie)
      .send({ actif: false });
    expect(res.status).toBe(404);
  });

  it('supprime un camion', async () => {
    camion.delete.mockResolvedValue({ id: ID } as never);
    const res = await request(app).delete(`/api/camions/${ID}`).set('Cookie', cookie);
    expect(res.status).toBe(204);
  });

  it('refuse de supprimer un camion déjà utilisé', async () => {
    camion.delete.mockRejectedValue(erreurPrisma('P2003'));
    const res = await request(app).delete(`/api/camions/${ID}`).set('Cookie', cookie);
    expect(res.status).toBe(409);
    expect(res.body.erreur.code).toBe('EN_COURS_UTILISATION');
  });
});

describe('/api/personnes', () => {
  it('filtre par rôle', async () => {
    personne.findMany.mockResolvedValue([] as never);
    const res = await request(app).get('/api/personnes?role=CHAUFFEUR').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(personne.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: 'CHAUFFEUR' } }),
    );
  });

  it('refuse un rôle inconnu', async () => {
    const res = await request(app).get('/api/personnes?role=PATRON').set('Cookie', cookie);
    expect(res.status).toBe(400);
  });

  it('crée une personne ; un téléphone vide devient null', async () => {
    personne.create.mockResolvedValue({ id: ID } as never);
    const res = await request(app)
      .post('/api/personnes')
      .set('Cookie', cookie)
      .send({ nom: 'Rakoto', role: 'CHAUFFEUR', telephone: '  ' });
    expect(res.status).toBe(201);
    expect(personne.create).toHaveBeenCalledWith({
      data: { nom: 'Rakoto', role: 'CHAUFFEUR', telephone: null, actif: true },
    });
  });

  it('ne touche pas au téléphone quand on modifie seulement le nom', async () => {
    personne.update.mockResolvedValue({ id: ID } as never);
    await request(app).patch(`/api/personnes/${ID}`).set('Cookie', cookie).send({ nom: 'Hery' });
    expect(personne.update).toHaveBeenCalledWith({ where: { id: ID }, data: { nom: 'Hery' } });
  });

  it('efface le téléphone quand on envoie un champ vide', async () => {
    personne.update.mockResolvedValue({ id: ID } as never);
    await request(app).patch(`/api/personnes/${ID}`).set('Cookie', cookie).send({ telephone: '' });
    expect(personne.update).toHaveBeenCalledWith({ where: { id: ID }, data: { telephone: null } });
  });

  it('refuse de supprimer une personne déjà utilisée', async () => {
    personne.delete.mockRejectedValue(erreurPrisma('P2003'));
    const res = await request(app).delete(`/api/personnes/${ID}`).set('Cookie', cookie);
    expect(res.status).toBe(409);
    expect(res.body.erreur.code).toBe('EN_COURS_UTILISATION');
  });
});
