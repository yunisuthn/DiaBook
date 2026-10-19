// Classes communes de l'interface provisoire (en attendant l'intégration du design, voir docs/design/).
export const styles = {
  carte: 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6',
  libelle: 'text-sm font-medium',
  champ:
    'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-blue-700 focus:outline-none',
  boutonPrincipal:
    'rounded-md bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60',
  boutonSecondaire:
    'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60',
  boutonLien: 'text-sm font-medium text-blue-900 hover:underline disabled:opacity-60',
  boutonDanger: 'text-sm font-medium text-red-700 hover:underline disabled:opacity-60',
  erreur: 'rounded-md bg-red-50 px-3 py-2 text-sm text-red-700',
  tableau: 'w-full text-left text-sm',
  entete: 'border-b border-slate-200 px-3 py-2 font-medium text-slate-500',
  cellule: 'border-b border-slate-100 px-3 py-2 align-middle',
};
