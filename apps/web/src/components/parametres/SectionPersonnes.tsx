import { type FormEvent, useState } from 'react';
import {
  LIBELLES_ROLE,
  type Personne,
  type RolePersonne,
  type SaisiePersonne,
  useEnregistrerPersonne,
  usePersonnes,
  useSupprimerPersonne,
} from '../../lib/referentiels';
import { styles } from '../../lib/styles';

const NOUVELLE: SaisiePersonne = { nom: '', role: 'CHAUFFEUR', telephone: null, actif: true };

function FormulairePersonne({
  personne,
  onFermer,
}: {
  personne: Personne | null;
  onFermer: () => void;
}) {
  const [saisie, setSaisie] = useState<SaisiePersonne>(personne ?? NOUVELLE);
  const enregistrer = useEnregistrerPersonne();

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    enregistrer.mutate({ id: personne?.id, donnees: saisie }, { onSuccess: onFermer });
  }

  return (
    <form onSubmit={soumettre} className="space-y-4 rounded-lg bg-slate-50 p-4">
      <h3 className="font-semibold">
        {personne ? `Modifier ${personne.nom}` : 'Nouvelle personne'}
      </h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className={styles.libelle}>Nom</span>
          <input
            required
            value={saisie.nom}
            onChange={(e) => setSaisie({ ...saisie, nom: e.target.value })}
            className={styles.champ}
          />
        </label>
        <label className="block">
          <span className={styles.libelle}>Rôle</span>
          <select
            value={saisie.role}
            onChange={(e) => setSaisie({ ...saisie, role: e.target.value as RolePersonne })}
            className={styles.champ}
          >
            <option value="CHAUFFEUR">{LIBELLES_ROLE.CHAUFFEUR}</option>
            <option value="RECEVEUR">{LIBELLES_ROLE.RECEVEUR}</option>
          </select>
        </label>
        <label className="block">
          <span className={styles.libelle}>
            Téléphone <span className="font-normal text-slate-500">(facultatif)</span>
          </span>
          <input
            type="tel"
            value={saisie.telephone ?? ''}
            onChange={(e) => setSaisie({ ...saisie, telephone: e.target.value })}
            placeholder="034 00 000 00"
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
        Actif
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

export function SectionPersonnes() {
  const { data: personnes, isPending, isError } = usePersonnes();
  const supprimer = useSupprimerPersonne();
  // null : formulaire fermé ; 'nouveau' : création ; sinon la personne modifiée.
  const [edition, setEdition] = useState<Personne | 'nouveau' | null>(null);

  function demanderSuppression(personne: Personne) {
    const role = LIBELLES_ROLE[personne.role].toLowerCase();
    if (window.confirm(`Supprimer le ${role} ${personne.nom} ?`)) {
      supprimer.mutate(personne.id);
    }
  }

  return (
    <section className={`${styles.carte} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Chauffeurs et receveurs</h2>
        {edition === null && (
          <button
            type="button"
            onClick={() => setEdition('nouveau')}
            className={styles.boutonPrincipal}
          >
            Ajouter une personne
          </button>
        )}
      </div>

      {edition !== null && (
        <FormulairePersonne
          key={edition === 'nouveau' ? 'nouveau' : edition.id}
          personne={edition === 'nouveau' ? null : edition}
          onFermer={() => setEdition(null)}
        />
      )}

      {supprimer.isError && (
        <p role="alert" className={styles.erreur}>
          {supprimer.error.message}
        </p>
      )}

      {isPending && <p className="text-sm text-slate-500">Chargement…</p>}
      {isError && <p className={styles.erreur}>Impossible de charger les personnes.</p>}
      {personnes?.length === 0 && (
        <p className="text-sm text-slate-500">
          Aucune personne. Ajoutez un chauffeur ou un receveur.
        </p>
      )}
      {personnes && personnes.length > 0 && (
        <div className="overflow-x-auto">
          <table className={styles.tableau}>
            <thead>
              <tr>
                <th className={styles.entete}>Nom</th>
                <th className={styles.entete}>Rôle</th>
                <th className={styles.entete}>Téléphone</th>
                <th className={styles.entete}>État</th>
                <th className={styles.entete}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {personnes.map((personne) => (
                <tr key={personne.id} className={personne.actif ? '' : 'text-slate-400'}>
                  <td className={styles.cellule}>{personne.nom}</td>
                  <td className={styles.cellule}>{LIBELLES_ROLE[personne.role]}</td>
                  <td className={`${styles.cellule} whitespace-nowrap`}>
                    {personne.telephone ?? '—'}
                  </td>
                  <td className={styles.cellule}>{personne.actif ? 'Actif' : 'Inactif'}</td>
                  <td className={`${styles.cellule} text-right whitespace-nowrap`}>
                    <button
                      type="button"
                      onClick={() => setEdition(personne)}
                      className={`${styles.boutonLien} mr-4`}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => demanderSuppression(personne)}
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
