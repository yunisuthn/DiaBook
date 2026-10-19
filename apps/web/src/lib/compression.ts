import imageCompression from 'browser-image-compression';
// Copie locale de la bibliothèque pour son web worker (sinon elle est téléchargée depuis un CDN externe).
import urlBibliotheque from 'browser-image-compression/dist/browser-image-compression.js?url';

/**
 * Réduit la photo avant envoi (1600 px au plus, JPEG) : moins de données mobiles, envoi plus rapide.
 * Le serveur refait le traitement complet ; en cas d'échec ici, on envoie l'original.
 */
export async function compresserPhoto(fichier: File): Promise<File> {
  const compresse = await imageCompression(fichier, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 1.5,
    initialQuality: 0.85,
    fileType: 'image/jpeg',
    useWebWorker: true,
    libURL: new URL(urlBibliotheque, window.location.href).href,
  });
  const nom = `${fichier.name.replace(/\.[^.]+$/, '') || 'page'}.jpg`;
  return new File([compresse], nom, { type: 'image/jpeg', lastModified: fichier.lastModified });
}
