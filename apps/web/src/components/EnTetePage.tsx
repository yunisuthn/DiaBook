import type { ReactNode } from 'react';

export function EnTetePage({ titre, children }: { titre: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold">{titre}</h1>
      {children && <p className="mt-1 text-slate-600">{children}</p>}
    </header>
  );
}
