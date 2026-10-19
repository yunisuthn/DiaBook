import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { EnTetePage } from '../components/EnTetePage';
import {
  type PhotoSelectionnee,
  VignettesTriables,
} from '../components/importer/VignettesTriables';
import { compresserPhoto } from '../lib/compression';
import { cleLot, envoyerLot } from '../lib/lots';
import { useCamions } from '../lib/referentiels';
import { styles } from '../lib/styles';

const PHOTOS_MAX = 20;

// Compteur plutôt que crypto.randomUUID, indisponible hors HTTPS (téléphone sur le réseau local).
let compteurPhotos = 0;
const nouvelId = () => `photo-${++compteurPhotos}`;

function BonnesPratiques() {
  return (
    <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <h2 className="font-semibold">Pour une bonne lecture</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Une seule page par photo.</li>
        <li>Cahier posé à plat, page entière dans le cadre.</li>
        <li>Pas d’ombre (ni de la main, ni du téléphone), pas de reflet.</li>
        <li>La date et le camion doivent être lisibles en haut de la page.</li>
      </ul>
    </aside>
  );
}

export function Importer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: camions, isPending: camionsEnChargement } = useCamions();
  const [camionId, setCamionId] = useState('');
  const [photos, setPhotos] = useState<PhotoSelectionnee[]>([]);
  const [avertissement, setAvertissement] = useState<string | null>(null);
  const [progression, setProgression] = useState(0);
  const entreeAppareil = useRef<HTMLInputElement>(null);
  const entreeGalerie = useRef<HTMLInputElement>(null);

  const camionsActifs = camions?.filter((camion) => camion.actif) ?? [];
  // Un seul camion actif : il est choisi d'office.
  const camionChoisi = camionId || (camionsActifs.length === 1 ? (camionsActifs[0]?.id ?? '') : '');

  // Libère les aperçus en mémoire en quittant la page.
  const photosCourantes = useRef(photos);
  useEffect(() => {
    photosCourantes.current = photos;
  }, [photos]);
  useEffect(
    () => () => photosCourantes.current.forEach((photo) => URL.revokeObjectURL(photo.apercu)),
    [],
  );

  const envoi = useMutation({
    mutationFn: () =>
      envoyerLot(
        camionChoisi,
        photos.map((photo) => photo.fichier),
        setProgression,
      ),
    onSuccess: (lot) => {
      queryClient.setQueryData(cleLot(lot.id), lot);
      navigate(`/lots/${lot.id}`);
    },
  });

  async function preparer(photo: PhotoSelectionnee) {
    let fichier = photo.fichier;
    let nonCompressee = false;
    try {
      fichier = await compresserPhoto(photo.fichier);
    } catch {
      nonCompressee = true;
    }
    const apercu = nonCompressee ? photo.apercu : URL.createObjectURL(fichier);
    setPhotos((actuelles) => {
      if (!actuelles.some((p) => p.id === photo.id)) {
        // Retirée pendant la compression.
        if (apercu !== photo.apercu) URL.revokeObjectURL(apercu);
        return actuelles;
      }
      if (apercu !== photo.apercu) URL.revokeObjectURL(photo.apercu);
      return actuelles.map((p) =>
        p.id === photo.id ? { ...p, fichier, apercu, etat: 'prete', nonCompressee } : p,
      );
    });
  }

  function ajouter(liste: FileList | null) {
    if (!liste || liste.length === 0) return;
    const place = Math.max(PHOTOS_MAX - photos.length, 0);
    const retenus = Array.from(liste).slice(0, place);
    const refuses = liste.length - retenus.length;
    setAvertissement(
      refuses > 0
        ? `${PHOTOS_MAX} photos au plus par envoi : ${refuses} photo(s) non ajoutée(s).`
        : null,
    );
    const nouvelles: PhotoSelectionnee[] = retenus.map((fichier) => ({
      id: nouvelId(),
      fichier,
      apercu: URL.createObjectURL(fichier),
      etat: 'compression',
    }));
    setPhotos((actuelles) => [...actuelles, ...nouvelles]);
    for (const photo of nouvelles) void preparer(photo);
  }

  function retirer(id: string) {
    const photo = photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.apercu);
    setPhotos(photos.filter((p) => p.id !== id));
    setAvertissement(null);
  }

  const compressionEnCours = photos.some((photo) => photo.etat === 'compression');
  const peutEnvoyer =
    camionChoisi !== '' && photos.length > 0 && !compressionEnCours && !envoi.isPending;
  const pourcentage = Math.round(progression * 100);

  return (
    <div className="space-y-6">
      <EnTetePage titre="Importer">Photographiez les pages du cahier de bord.</EnTetePage>
      <BonnesPratiques />

      <section className={`${styles.carte} space-y-3`}>
        <h2 className="text-lg font-semibold">1. Camion</h2>
        {camionsEnChargement && <p className="text-sm text-slate-500">Chargement…</p>}
        {camions && camionsActifs.length === 0 && (
          <p className="text-sm text-slate-600">
            Aucun camion actif.{' '}
            <Link to="/parametres" className="font-medium text-blue-900 underline">
              Ajoutez un camion dans Paramètres
            </Link>
            .
          </p>
        )}
        {camionsActifs.length > 0 && (
          <label className="block max-w-sm">
            <span className={styles.libelle}>Camion du cahier</span>
            <select
              value={camionChoisi}
              onChange={(e) => setCamionId(e.target.value)}
              disabled={envoi.isPending}
              className={styles.champ}
            >
              {camionsActifs.length > 1 && <option value="">Choisir un camion…</option>}
              {camionsActifs.map((camion) => (
                <option key={camion.id} value={camion.id}>
                  {camion.immatriculation} — {camion.nom}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section className={`${styles.carte} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">2. Pages</h2>
          <span className="text-sm text-slate-500">
            {photos.length} / {PHOTOS_MAX}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => entreeAppareil.current?.click()}
            disabled={envoi.isPending || photos.length >= PHOTOS_MAX}
            className={styles.boutonPrincipal}
          >
            Prendre une photo
          </button>
          <button
            type="button"
            onClick={() => entreeGalerie.current?.click()}
            disabled={envoi.isPending || photos.length >= PHOTOS_MAX}
            className={styles.boutonSecondaire}
          >
            Choisir dans la galerie
          </button>
          <input
            ref={entreeAppareil}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              ajouter(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={entreeGalerie}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              ajouter(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        {avertissement && <p className={styles.erreur}>{avertissement}</p>}

        {photos.length > 0 ? (
          <>
            <p className="text-sm text-slate-600">
              Le numéro de chaque vignette est l’ordre des pages du cahier. Faites glisser une
              vignette (appui long sur téléphone) pour la déplacer.
            </p>
            <VignettesTriables
              photos={photos}
              onChange={setPhotos}
              onRetirer={retirer}
              desactive={envoi.isPending}
            />
          </>
        ) : (
          <p className="text-sm text-slate-500">Aucune page pour l’instant.</p>
        )}
      </section>

      <section className={`${styles.carte} space-y-3`}>
        <button
          type="button"
          onClick={() => {
            setProgression(0);
            envoi.mutate();
          }}
          disabled={!peutEnvoyer}
          className={`${styles.boutonPrincipal} w-full sm:w-auto`}
        >
          {envoi.isPending
            ? 'Envoi en cours…'
            : `Envoyer ${photos.length > 0 ? `${photos.length} page${photos.length > 1 ? 's' : ''}` : ''}`}
        </button>
        {!camionChoisi && photos.length > 0 && (
          <p className="text-sm text-slate-600">Choisissez d’abord le camion.</p>
        )}
        {compressionEnCours && <p className="text-sm text-slate-600">Préparation des photos…</p>}
        {envoi.isPending && (
          <div className="space-y-1">
            <div
              role="progressbar"
              aria-label="Envoi des photos"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pourcentage}
              className="h-2 overflow-hidden rounded-full bg-slate-200"
            >
              <div
                className="h-full bg-blue-900 transition-[width]"
                style={{ width: `${pourcentage}%` }}
              />
            </div>
            <p className="text-sm text-slate-600">
              {pourcentage < 100
                ? `Envoi : ${pourcentage} %`
                : 'Photos envoyées, traitement sur le serveur…'}
            </p>
          </div>
        )}
        {envoi.isError && (
          <p role="alert" className={styles.erreur}>
            {envoi.error.message}
          </p>
        )}
      </section>
    </div>
  );
}
