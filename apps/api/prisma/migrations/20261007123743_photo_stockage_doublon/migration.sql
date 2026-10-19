/*
  Warnings:

  - Added the required column `hauteur` to the `photos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `largeur` to the `photos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stockage_id` to the `photos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "distance_doublon" INTEGER,
ADD COLUMN     "doublon_de_id" TEXT,
ADD COLUMN     "hauteur" INTEGER NOT NULL,
ADD COLUMN     "largeur" INTEGER NOT NULL,
ADD COLUMN     "stockage_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_doublon_de_id_fkey" FOREIGN KEY ("doublon_de_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
