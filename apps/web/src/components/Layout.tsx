import { NavLink, Outlet, useNavigate } from 'react-router';
import { useDeconnexion, useUtilisateur } from '../lib/auth';

const MENU = [
  { vers: '/', libelle: 'Tableau de bord' },
  { vers: '/journees', libelle: 'Journées' },
  { vers: '/importer', libelle: 'Importer' },
  { vers: '/creances', libelle: 'Créances' },
  { vers: '/parametres', libelle: 'Paramètres' },
];

function classeLien({ isActive }: { isActive: boolean }) {
  return [
    'block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-blue-900 text-white' : 'text-slate-700 hover:bg-slate-200',
  ].join(' ');
}

export function Layout() {
  const { data: utilisateur } = useUtilisateur();
  const deconnexion = useDeconnexion();
  const navigate = useNavigate();

  function seDeconnecter() {
    deconnexion.mutate(undefined, { onSuccess: () => navigate('/connexion', { replace: true }) });
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 md:block md:py-5">
          <span className="text-lg font-bold text-blue-900">DiaBook</span>
          <button
            type="button"
            onClick={seDeconnecter}
            className="text-sm text-slate-600 hover:text-slate-900 md:hidden"
          >
            Déconnexion
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3">
          {MENU.map(({ vers, libelle }) => (
            <NavLink key={vers} to={vers} end={vers === '/'} className={classeLien}>
              {libelle}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-4 py-4 text-sm text-slate-600 md:block">
          <p className="truncate">{utilisateur?.email}</p>
          <button
            type="button"
            onClick={seDeconnecter}
            disabled={deconnexion.isPending}
            className="mt-2 text-slate-600 underline hover:text-slate-900"
          >
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
