import { Navigate, Outlet, useLocation } from 'react-router';
import { useUtilisateur } from '../lib/auth';

export function RouteProtegee() {
  const { data: utilisateur, isPending, isError } = useUtilisateur();
  const location = useLocation();

  if (isPending) {
    return <div className="grid min-h-screen place-items-center text-slate-500">Chargement…</div>;
  }
  if (isError) {
    return (
      <div className="grid min-h-screen place-items-center text-red-700">
        Impossible de joindre le serveur.
      </div>
    );
  }
  if (!utilisateur) {
    return <Navigate to="/connexion" replace state={{ depuis: location.pathname }} />;
  }
  return <Outlet />;
}
