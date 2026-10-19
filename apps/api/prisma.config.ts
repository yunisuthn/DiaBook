import path from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Le fichier .env est partagé à la racine du monorepo.
config({ path: path.resolve(import.meta.dirname, '../../.env'), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Valeur de repli pour que « prisma generate » fonctionne sans .env (ex. à l'installation).
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/diabook',
  },
});
