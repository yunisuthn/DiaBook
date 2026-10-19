import { type FormEvent, useState } from 'react';
import {
  type Camion,
  type SaisieCamion,
  useCamions,
  useEnregistrerCamion,
  useSupprimerCamion,
} from '../../lib/referentiels';
import { styles } from '../../lib/styles';

const NOUVEAU: SaisieCamion = { immatriculation: '', nom: '', actif: true };

function FormulaireCamion({ camion, onFermer }: { camion: Camion | null; onFermer: () => void }) {
  const [saisie, setSaisie] = useState<SaisieCamion>(camion ?? NOUVEAU);
  const enregistrer = useEnregistrerCamion();

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    enregistrer.mutate({ id: camion?.id, donnees: saisie }, { onSuccess: onFermer });
  }

  return (
    <form onSubmit={soumettre} className="space-y-4 rounded-lg bg-slate-50 p-4">
      <h3 className="font-semibold">
        {camion ? `Modifier ${camion.immatriculation}` : 'Nouveau camion'}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={styles.libelle}>Immatriculation</span>
          <input
            required
            value={saisie.immatriculation}
            onChange={(e) => setSaisie({ ...saisie, immatriculation: e.target.value })}
            placeholder="1234 TBA"
            className={styles.champ}
          />
        </label>
        <label className="block">
          <span className={styles.libelle}>Nom</span>
          <input
            required
            value={saisie.nom}
            onChange={(e) => setSaisie({ ...saisie, nom: e.target.value })}
            placeholder="Camion bleu"
            className={styles.champ}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={saisie.actif}
          onChange={(e) => setSaisie({ ...saisie, actif: e.target.checked })}
          className="size-4"
        />
        Actif (proposé à l’import des photos)
      </label>
      {enregistrer.isError && (
        <p role="alert" className={styles.erreur}>
          {enregistrer.error.message}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={enregistrer.isPending} className={styles.boutonPrincipal}>
          {enregistrer.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onFermer} className={styles.boutonSecondaire}>
          Annuler
        </button>
      </div>
    </form>
  );
}

export function SectionCamions() {
  const { data: camions, isPending, isError } = useCamions();
  const supprimer = useSupprimerCamion();
  // null : formulaire fermé ; 'nouveau' : création ; sinon le camion modifié.
  const [edition, setEdition] = useState<Camion | 'nouveau' | null>(null);

  function demanderSuppression(camion: Camion) {
    if (window.confirm(`Supprimer le camion ${camion.immatriculation} (${camion.nom}) ?`)) {
      supprimer.mutate(camion.id);
    }
  }

  return (
    <section className={`${styles.carte} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Camions</h2>
        {edition === null && (
          <button
            type="button"
            onClick={() => setEdition('nouveau')}
            className={styles.boutonPrincipal}
          >
            Ajouter un camion
          </button>
        )}
      </div>

      {edition !== null && (
        <FormulaireCamion
          key={edition === 'nouveau' ? 'nouveau' : edition.id}
          camion={edition === 'nouveau' ? null : edition}
          onFermer={() => setEdition(null)}
        />
      )}

      {supprimer.isError && (
        <p role="alert" className={styles.erreur}>
          {supprimer.error.message}
        </p>
      )}

      {isPending && <p className="text-sm text-slate-500">Chargement…</p>}
      {isError && <p className={styles.erreur}>Impossible de charger les camions.</p>}
      {camions?.length === 0 && (
        <p className="text-sm text-slate-500">Aucun camion. Ajoutez le premier.</p>
      )}
      {camions && camions.length > 0 && (
        <div className="overflow-x-auto">
          <table className={styles.tableau}>
            <thead>
              <tr>
                <th className={styles.entete}>Immatriculation</th>
                <th className={styles.entete}>Nom</th>
                <th className={styles.entete}>État</th>
                <th className={styles.entete}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {camions.map((camion) => (
                <tr key={camion.id} className={camion.actif ? '' : 'text-slate-400'}>
                  <td className={`${styles.cellule} font-mono`}>{camion.immatriculation}</td>
                  <td className={styles.cellule}>{camion.nom}</td>
                  <td className={styles.cellule}>{camion.actif ? 'Actif' : 'Inactif'}</td>
                  <td className={`${styles.cellule} text-right whitespace-nowrap`}>
                    <button
                      type="button"
                      onClick={() => setEdition(camion)}
                      className={`${styles.boutonLien} mr-4`}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => demanderSuppression(camion)}
                      disabled={supprimer.isPending}
                      className={styles.boutonDanger}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
