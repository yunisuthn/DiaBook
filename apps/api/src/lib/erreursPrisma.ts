import { Prisma } from '../generated/prisma/client.js';

/** Code d'erreur Prisma (P2002 : valeur unique déjà prise, P2003 : ligne référencée, P2025 : introuvable). */
export function codeErreurPrisma(erreur: unknown): string | undefined {
  return erreur instanceof Prisma.PrismaClientKnownRequestError ? erreur.code : undefined;
}
