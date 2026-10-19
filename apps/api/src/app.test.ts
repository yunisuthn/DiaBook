import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { creerApp } from './app.js';
import { hacherMotDePasse } from './lib/motDePasse.js';
import { prisma } from './lib/prisma.js';

vi.mock('./lib/prisma.js', () => ({
  prisma: { utilisateur: { findUnique: vi.fn() } },
}));

const findUnique = vi.mocked(prisma.utilisateur.findUnique);
const app = creerApp();

describe('GET /api/sante', () => {
  it('répond ok', async () => {
    const res = await request(app).get('/api/sante');
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('ok');
  });
});

describe('gestion des erreurs', () => {
  it('renvoie 404 au format { erreur: { code, message } }', async () => {
    const res = await request(app).get('/api/inexistant');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erreur: { code: 'NON_TROUVE', message: expect.any(String) } });
  });

  it('renvoie 400 si le JSON est invalide', async () => {
    const res = await request(app)
      .post('/api/auth/connexion')
      .set('Content-Type', 'application/json')
      .send('{pas du json');
    expect(res.status).toBe(400);
    expect(res.body.erreur.code).toBe('JSON_INVALIDE');
  });

  it('renvoie 400 si les données ne respectent pas le schéma', async () => {
    const res = await request(app).post('/api/auth/connexion').send({ email: 'pas-un-email' });
    expect(res.status).toBe(400);
    expect(res.body.erreur.code).toBe('DONNEES_INVALIDES');
  });
});

describe('authentification', () => {
  const motDePasse = 'motdepasse-solide';
  let utilisateur: { id: string; email: string; motDePasseHash: string };

  beforeEach(async () => {
    utilisateur = {
      id: 'u1',
      email: 'admin@diabook.local',
      motDePasseHash: await hacherMotDePasse(motDePasse),
    };
    findUnique.mockReset();
  });

  it('refuse /api/auth/moi sans cookie', async () => {
    const res = await request(app).get('/api/auth/moi');
    expect(res.status).toBe(401);
    expect(res.body.erreur.code).toBe('NON_AUTHENTIFIE');
  });

  it('refuse un mauvais mot de passe', async () => {
    findUnique.mockResolvedValue(utilisateur as never);
    const res = await request(app)
      .post('/api/auth/connexion')
      .send({ email: utilisateur.email, motDePasse: 'faux' });
    expect(res.status).toBe(401);
    expect(res.body.erreur.code).toBe('IDENTIFIANTS_INVALIDES');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('refuse un email inconnu', async () => {
    findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/connexion')
      .send({ email: 'inconnu@diabook.local', motDePasse });
    expect(res.status).toBe(401);
    expect(res.body.erreur.code).toBe('IDENTIFIANTS_INVALIDES');
  });

  it('connecte, pose un cookie httpOnly et donne accès à /api/auth/moi', async () => {
    findUnique.mockResolvedValue(utilisateur as never);
    const agent = request.agent(app);

    const connexion = await agent
      .post('/api/auth/connexion')
      .send({ email: 'ADMIN@diabook.local ', motDePasse });
    expect(connexion.status).toBe(200);
    const cookie = String(connexion.headers['set-cookie']);
    expect(cookie).toMatch(/diabook_session=/);
    expect(cookie).toMatch(/HttpOnly/);

    const moi = await agent.get('/api/auth/moi');
    expect(moi.status).toBe(200);
    expect(moi.body.utilisateur).toEqual({ id: 'u1', email: 'admin@diabook.local' });

    await agent.post('/api/auth/deconnexion').expect(204);
    await agent.get('/api/auth/moi').expect(401);
  });
});
