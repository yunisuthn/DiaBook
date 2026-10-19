-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('CAISSE', 'HORS_CAISSE');

-- AlterTable
ALTER TABLE "paiements" ADD COLUMN     "mode" "ModePaiement" NOT NULL DEFAULT 'CAISSE';
