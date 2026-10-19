import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useConnexion, useUtilisateur } from '../lib/auth';

export function Connexion() {
  const { data: utilisateur } = useUtilisateur();
  const connexion = useConnexion();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');

  const destination = (location.state as { depuis?: string } | null)?.depuis ?? '/';

  if (utilisateur) return <Navigate to={destination} replace />;

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    connexion.mutate(
      { email, motDePasse },
      { onSuccess: () => navigate(destination, { replace: true }) },
    );
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form
        onSubmit={soumettre}
        className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-bold text-blue-900">DiaBook</h1>
          <p className="text-sm text-slate-600">Connexion administrateur</p>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-700 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Mot de passe</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-700 focus:outline-none"
          />
        </label>

        {connexion.isError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {connexion.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={connexion.isPending}
          className="w-full rounded-md bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {connexion.isPending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
