import { useRef, useState } from 'react';
import { lireFluxSSE } from './lireFluxSSE.js';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [reponse, setReponse] = useState('');
  const [etat, setEtat] = useState('pret'); // pret | en-cours | fini | arrete | erreur
  const [erreur, setErreur] = useState('');
  const [usage, setUsage] = useState(null);

  // useRef garde le contrôleur entre deux rendus, sans déclencher de nouveau rendu.
  const annulationRef = useRef(null);

  async function envoyer(event) {
    event.preventDefault(); // pas de rechargement de la page à l'envoi du formulaire
    const annulation = new AbortController();
    annulationRef.current = annulation;

    setReponse('');
    setErreur('');
    setUsage(null);
    setEtat('en-cours');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: annulation.signal, // permet au bouton « Stop » de couper la connexion
      });

      // Erreur AVANT le flux (validation, clé, quota) : le serveur renvoie du JSON.
      if (!res.ok) {
        const corps = await res.json().catch(() => ({}));
        throw new Error(corps.erreur ?? `Erreur HTTP ${res.status}`);
      }

      for await (const { type, donnees } of lireFluxSSE(res.body)) {
        if (type === 'texte') {
          // Forme « fonction » de setState : on part toujours de la dernière valeur,
          // sinon les morceaux reçus très vite pourraient s'écraser entre eux.
          setReponse((precedente) => precedente + donnees.texte);
        } else if (type === 'fin') {
          setUsage(donnees);
        } else if (type === 'erreur') {
          throw new Error(donnees.message);
        }
      }
      setEtat('fini');
    } catch (err) {
      if (annulation.signal.aborted) {
        setEtat('arrete');
      } else {
        setErreur(err.message);
        setEtat('erreur');
      }
    }
  }

  function arreter() {
    annulationRef.current?.abort();
  }

  const enCours = etat === 'en-cours';

  return (
    <main>
      <h1>DiaBook · Semaine 1</h1>
      <p className="sous-titre">Pose une question : la réponse s'affiche au fur et à mesure.</p>

      <form onSubmit={envoyer}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex. : Explique en 3 phrases à quoi sert un cahier de bord de camion."
          rows={4}
          disabled={enCours}
        />
        <div className="boutons">
          <button type="submit" disabled={enCours || !prompt.trim()}>
            Envoyer
          </button>
          <button type="button" onClick={arreter} disabled={!enCours} className="stop">
            Stop
          </button>
        </div>
      </form>

      {erreur && <p className="erreur">❌ {erreur}</p>}

      {(reponse || enCours) && (
        <section className="reponse">
          {reponse}
          {enCours && <span className="curseur">▍</span>}
        </section>
      )}

      {etat === 'arrete' && <p className="info">⏹ Génération arrêtée.</p>}
      {usage && (
        <p className="info">
          {usage.modele} · entrée {usage.entree} tokens · sortie {usage.sortie} tokens · réflexion{' '}
          {usage.reflexion} tokens
        </p>
      )}
    </main>
  );
}
