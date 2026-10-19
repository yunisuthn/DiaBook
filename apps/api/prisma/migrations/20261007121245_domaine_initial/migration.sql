-- CreateEnum
CREATE TYPE "RolePersonne" AS ENUM ('CHAUFFEUR', 'RECEVEUR');

-- CreateEnum
CREATE TYPE "StatutLot" AS ENUM ('RECU', 'EN_COURS', 'TERMINE', 'ERREUR');

-- CreateEnum
CREATE TYPE "StatutPhoto" AS ENUM ('RECUE', 'EN_COURS', 'EXTRAITE', 'ERREUR');

-- CreateEnum
CREATE TYPE "StatutJournee" AS ENUM ('BROUILLON', 'A_VERIFIER', 'VALIDEE');

-- CreateEnum
CREATE TYPE "Produit" AS ENUM ('SABLE', 'BRIQUE', 'MOELLON', 'GRAVILLON', 'BOIS', 'DEMENAGEMENT', 'AUTRE', 'INCONNU');

-- CreateEnum
CREATE TYPE "StatutVoyage" AS ENUM ('PAYE', 'SERVICE', 'EN_ATTENTE', 'INCONNU');

-- CreateEnum
CREATE TYPE "CategorieDepense" AS ENUM ('REPAS', 'GASOIL', 'DOKERA', 'POLICE', 'MOTARD', 'CROIX', 'RISTOURNE', 'ACHAT_MARCHANDISE', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('APPORT', 'REMISE', 'TOTAL_ECRIT', 'AUTRE');

-- CreateEnum
CREATE TYPE "NiveauAlerte" AS ENUM ('ERREUR', 'ATTENTION', 'INFO');

-- CreateTable
CREATE TABLE "camions" (
    "id" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "camions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnes" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" "RolePersonne" NOT NULL,
    "telephone" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lieux" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lieux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lieux_variantes" (
    "id" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "lieu_id" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lieux_variantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" TEXT NOT NULL,
    "camion_id" TEXT NOT NULL,
    "cree_par_id" TEXT NOT NULL,
    "statut" "StatutLot" NOT NULL DEFAULT 'RECU',
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "hash_perceptuel" TEXT NOT NULL,
    "date_upload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "camion_id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "ordre_dans_lot" INTEGER NOT NULL,
    "statut" "StatutPhoto" NOT NULL DEFAULT 'RECUE',

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extractions" (
    "id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "json_brut" JSONB,
    "duree_ms" INTEGER NOT NULL,
    "tokens_entree" INTEGER,
    "tokens_sortie" INTEGER,
    "erreur" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journees" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "camion_id" TEXT NOT NULL,
    "chauffeur_id" TEXT,
    "receveur_id" TEXT,
    "date_deduite" BOOLEAN NOT NULL DEFAULT false,
    "solde_ecrit" INTEGER,
    "solde_calcule" INTEGER NOT NULL,
    "statut" "StatutJournee" NOT NULL DEFAULT 'BROUILLON',
    "validee_par_id" TEXT,
    "validee_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voyages" (
    "id" TEXT NOT NULL,
    "journee_id" TEXT NOT NULL,
    "numero" INTEGER,
    "produit" "Produit" NOT NULL,
    "produit_brut" TEXT,
    "quantite" DOUBLE PRECISION,
    "unite" TEXT,
    "pieces" INTEGER,
    "origine_id" TEXT,
    "destination_id" TEXT,
    "origine_brute" TEXT,
    "destination_brute" TEXT,
    "montant" INTEGER NOT NULL,
    "retenue" INTEGER NOT NULL DEFAULT 0,
    "statut" "StatutVoyage" NOT NULL,
    "texte_brut" TEXT NOT NULL,
    "confiance" DOUBLE PRECISION NOT NULL,
    "photo_id" TEXT NOT NULL,

    CONSTRAINT "voyages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depenses" (
    "id" TEXT NOT NULL,
    "journee_id" TEXT NOT NULL,
    "categorie" "CategorieDepense" NOT NULL,
    "libelle_brut" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "confiance" DOUBLE PRECISION NOT NULL,
    "photo_id" TEXT NOT NULL,

    CONSTRAINT "depenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements" (
    "id" TEXT NOT NULL,
    "journee_id" TEXT NOT NULL,
    "type" "TypeMouvement" NOT NULL,
    "libelle_brut" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "photo_id" TEXT NOT NULL,

    CONSTRAINT "mouvements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertes" (
    "id" TEXT NOT NULL,
    "journee_id" TEXT,
    "niveau" "NiveauAlerte" NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resolue" BOOLEAN NOT NULL DEFAULT false,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" TEXT NOT NULL,
    "voyage_id" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "camions_immatriculation_key" ON "camions"("immatriculation");

-- CreateIndex
CREATE INDEX "personnes_role_idx" ON "personnes"("role");

-- CreateIndex
CREATE UNIQUE INDEX "lieux_nom_key" ON "lieux"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "lieux_variantes_texte_key" ON "lieux_variantes"("texte");

-- CreateIndex
CREATE INDEX "lieux_variantes_lieu_id_idx" ON "lieux_variantes"("lieu_id");

-- CreateIndex
CREATE INDEX "lots_camion_id_idx" ON "lots"("camion_id");

-- CreateIndex
CREATE INDEX "lots_statut_idx" ON "lots"("statut");

-- CreateIndex
CREATE INDEX "photos_camion_id_idx" ON "photos"("camion_id");

-- CreateIndex
CREATE INDEX "photos_statut_idx" ON "photos"("statut");

-- CreateIndex
CREATE INDEX "photos_hash_perceptuel_idx" ON "photos"("hash_perceptuel");

-- CreateIndex
CREATE UNIQUE INDEX "photos_lot_id_ordre_dans_lot_key" ON "photos"("lot_id", "ordre_dans_lot");

-- CreateIndex
CREATE INDEX "extractions_photo_id_idx" ON "extractions"("photo_id");

-- CreateIndex
CREATE INDEX "journees_date_idx" ON "journees"("date");

-- CreateIndex
CREATE INDEX "journees_statut_idx" ON "journees"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "journees_camion_id_date_key" ON "journees"("camion_id", "date");

-- CreateIndex
CREATE INDEX "voyages_journee_id_idx" ON "voyages"("journee_id");

-- CreateIndex
CREATE INDEX "voyages_statut_idx" ON "voyages"("statut");

-- CreateIndex
CREATE INDEX "voyages_numero_idx" ON "voyages"("numero");

-- CreateIndex
CREATE INDEX "depenses_journee_id_idx" ON "depenses"("journee_id");

-- CreateIndex
CREATE INDEX "mouvements_journee_id_idx" ON "mouvements"("journee_id");

-- CreateIndex
CREATE INDEX "alertes_journee_id_idx" ON "alertes"("journee_id");

-- CreateIndex
CREATE INDEX "alertes_resolue_idx" ON "alertes"("resolue");

-- CreateIndex
CREATE INDEX "paiements_voyage_id_idx" ON "paiements"("voyage_id");

-- CreateIndex
CREATE INDEX "paiements_date_idx" ON "paiements"("date");

-- AddForeignKey
ALTER TABLE "lieux_variantes" ADD CONSTRAINT "lieux_variantes_lieu_id_fkey" FOREIGN KEY ("lieu_id") REFERENCES "lieux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_camion_id_fkey" FOREIGN KEY ("camion_id") REFERENCES "camions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_cree_par_id_fkey" FOREIGN KEY ("cree_par_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_camion_id_fkey" FOREIGN KEY ("camion_id") REFERENCES "camions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extractions" ADD CONSTRAINT "extractions_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journees" ADD CONSTRAINT "journees_camion_id_fkey" FOREIGN KEY ("camion_id") REFERENCES "camions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journees" ADD CONSTRAINT "journees_chauffeur_id_fkey" FOREIGN KEY ("chauffeur_id") REFERENCES "personnes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journees" ADD CONSTRAINT "journees_receveur_id_fkey" FOREIGN KEY ("receveur_id") REFERENCES "personnes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journees" ADD CONSTRAINT "journees_validee_par_id_fkey" FOREIGN KEY ("validee_par_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voyages" ADD CONSTRAINT "voyages_journee_id_fkey" FOREIGN KEY ("journee_id") REFERENCES "journees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voyages" ADD CONSTRAINT "voyages_origine_id_fkey" FOREIGN KEY ("origine_id") REFERENCES "lieux"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voyages" ADD CONSTRAINT "voyages_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "lieux"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voyages" ADD CONSTRAINT "voyages_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depenses" ADD CONSTRAINT "depenses_journee_id_fkey" FOREIGN KEY ("journee_id") REFERENCES "journees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depenses" ADD CONSTRAINT "depenses_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements" ADD CONSTRAINT "mouvements_journee_id_fkey" FOREIGN KEY ("journee_id") REFERENCES "journees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements" ADD CONSTRAINT "mouvements_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertes" ADD CONSTRAINT "alertes_journee_id_fkey" FOREIGN KEY ("journee_id") REFERENCES "journees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_voyage_id_fkey" FOREIGN KEY ("voyage_id") REFERENCES "voyages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
