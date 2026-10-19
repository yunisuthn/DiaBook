import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { EnTetePage } from '../components/EnTetePage';
import {
  cleLot,
  LIBELLES_STATUT_PHOTO,
  type PhotoLot,
  type ProgressionLot,
  useLot,
  useProgressionLot,
} from '../lib/lots';
import { styles } from '../lib/styles';

const dateHeure = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Indian/Antananarivo',
});

function CartePhoto({ photo, lotId }: { photo: PhotoLot; lotId: string }) {
  const doublon = photo.doublonProbable;
  return (
    <li className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <a
        href={photo.url}
        target="_blank"
        rel="noreferrer"
        className="block aspect-[3/4] bg-slate-100"
      >
        <img
          src={photo.url}
          alt={`Page ${photo.ordre}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </a>
      <div className="space-y-1 p-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">Page {photo.ordre}</span>
          <span className="text-slate-500">{LIBELLES_STATUT_PHOTO[photo.statut]}</span>
        </div>
        {doublon && (
          <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">
            Doublon probable :{' '}
            {doublon.lotId === lotId ? (
              'ressemble à une autre page de cet envoi.'
            ) : (
              <Link to={`/lots/${doublon.lotId}`} className="underline">
                déjà reçue dans un envoi précédent
              </Link>
            )}
          </p>
        )}
      </div>
    </li>
  );
}

function Progression({ progression }: { progression: ProgressionLot }) {
  const traitees = progression.lues + progression.erreurs;
  const pourcentage = progression.total ? Math.round((traitees / progression.total) * 100) : 0;
  return (
    <section className={`${styles.carte} space-y-2`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          {progression.lues} / {progression.total} page{progression.total > 1 ? 's' : ''} lue
          {progression.lues > 1 ? 's' : ''}
        </h2>
        <span className="text-sm text-slate-500">
          {progression.termine
            ? 'Lecture terminée'
            : progression.enCours > 0
              ? 'Lecture en cours…'
              : 'En attente de lecture'}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Lecture des pages"
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
      {progression.erreurs > 0 && (
        <p className="text-sm text-red-700">
          {progression.erreurs} page{progression.erreurs > 1 ? 's' : ''} n’
          {progression.erreurs > 1 ? 'ont' : 'a'} pas pu être lue
          {progression.erreurs > 1 ? 's' : ''}.
        </p>
      )}
      {!progression.lectureActive && !progression.termine && (
        <p className="text-sm text-amber-800">
          La lecture automatique est désactivée : la clé de l’API Claude (ANTHROPIC_API_KEY) n’est
          pas configurée sur le serveur. Les pages seront lues au prochain démarrage avec une clé.
        </p>
      )}
    </section>
  );
}

export function Lot() {
  const { id = '' } = useParams();
  const { data: lot, isPending, isError, error } = useLot(id);
  const { data: progression } = useProgressionLot(id);
  const queryClient = useQueryClient();

  // Une page de plus a été lue : on recharge le statut des photos.
  const traitees = progression ? progression.lues + progression.erreurs : 0;
  useEffect(() => {
    if (traitees > 0) void queryClient.invalidateQueries({ queryKey: cleLot(id), exact: true });
  }, [traitees, id, queryClient]);

  if (isPending) return <p className="text-slate-500">Chargement…</p>;
  if (isError) return <p className={styles.erreur}>{error.message}</p>;

  const doublons = lot.photos.filter((photo) => photo.doublonProbable).length;

  return (
    <div className="space-y-6">
      <EnTetePage titre={`Envoi du ${dateHeure.format(new Date(lot.creeLe))}`}>
        {lot.camion.immatriculation} — {lot.camion.nom} · {lot.photos.length} page
        {lot.photos.length > 1 ? 's' : ''}
      </EnTetePage>

      {progression && <Progression progression={progression} />}

      {doublons > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {doublons} photo{doublons > 1 ? 's ressemblent' : ' ressemble'} à une page déjà reçue.
          Elles sont gardées : vérifiez-les avant la lecture.
        </p>
      )}

      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {lot.photos.map((photo) => (
          <CartePhoto key={photo.id} photo={photo} lotId={lot.id} />
        ))}
      </ol>

      <Link to="/importer" className={styles.boutonSecondaire}>
        Importer d’autres pages
      </Link>
    </div>
  );
}
