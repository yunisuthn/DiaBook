import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { config, estProduction } from '../config.js';

export interface FichierStocke {
  url: string;
  /** Identifiant chez l'hébergeur, pour la suppression */
  id: string;
}

export interface StockagePhotos {
  envoyer(image: Buffer, emplacement: { dossier: string; nom: string }): Promise<FichierStocke>;
  /** Relit une photo stockée (pour l'extraction). */
  lire(fichier: FichierStocke): Promise<Buffer>;
  supprimer(id: string): Promise<void>;
}

function stockageCloudinary(): StockagePhotos {
  // Le SDK lit CLOUDINARY_URL (cloudinary://<clé>:<secret>@<cloud>) dans l'environnement.
  cloudinary.config({ secure: true });
  return {
    envoyer: (image, { dossier, nom }) =>
      new Promise((resoudre, rejeter) => {
        cloudinary.uploader
          .upload_stream(
            { folder: dossier, public_id: nom, resource_type: 'image', overwrite: false },
            (erreur, reponse) => {
              if (erreur || !reponse) rejeter(erreur ?? new Error('Réponse Cloudinary vide'));
              else resoudre({ url: reponse.secure_url, id: reponse.public_id });
            },
          )
          .end(image);
      }),
    lire: async ({ url }) => {
      const reponse = await fetch(url);
      if (!reponse.ok) throw new Error(`Photo illisible sur Cloudinary (${reponse.status})`);
      return Buffer.from(await reponse.arrayBuffer());
    },
    supprimer: async (id) => {
      await cloudinary.uploader.destroy(id, { resource_type: 'image' });
    },
  };
}

/** Développement sans Cloudinary : fichiers dans apps/api/uploads, servis sous /api/fichiers. */
function stockageLocal(dossierRacine: string): StockagePhotos {
  return {
    envoyer: async (image, { dossier, nom }) => {
      const relatif = `${dossier}/${nom}.jpg`;
      await mkdir(path.join(dossierRacine, dossier), { recursive: true });
      await writeFile(path.join(dossierRacine, relatif), image);
      return { url: `/api/fichiers/${relatif}`, id: relatif };
    },
    lire: ({ id }) => readFile(path.join(dossierRacine, id)),
    supprimer: async (id) => {
      await unlink(path.join(dossierRacine, id)).catch(() => undefined);
    },
  };
}

/** Dossier des photos en stockage local (null si Cloudinary est utilisé). */
export const dossierLocal =
  !config.CLOUDINARY_URL && !estProduction
    ? path.resolve(import.meta.dirname, '../../uploads')
    : null;

/** null en production sans CLOUDINARY_URL : l'import de photos est alors indisponible. */
export const stockage: StockagePhotos | null = config.CLOUDINARY_URL
  ? stockageCloudinary()
  : dossierLocal
    ? stockageLocal(dossierLocal)
    : null;
