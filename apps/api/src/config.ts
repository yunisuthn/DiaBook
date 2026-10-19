import path from 'node:path';
import { config as chargerDotenv } from 'dotenv';
import { z } from 'zod';

// Le fichier .env est partagé à la racine du monorepo (src/ et dist/ sont au même niveau).
chargerDotenv({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true });

const schemaEnv = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL est obligatoire'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET doit contenir au moins 32 caractères'),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),
});

const resultat = schemaEnv.safeParse(process.env);
if (!resultat.success) {
  console.error('Configuration invalide :\n' + z.prettifyError(resultat.error));
  process.exit(1);
}

export const config = resultat.data;
export const estProduction = config.NODE_ENV === 'production';
