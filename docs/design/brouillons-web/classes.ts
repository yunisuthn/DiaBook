/** Assemble des classes CSS en ignorant les valeurs vides. */
export function classes(...valeurs: (string | false | null | undefined)[]): string {
  return valeurs.filter(Boolean).join(' ');
}

/** Apparence commune des champs de saisie (input, select). */
export const classesSaisie =
  'h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-body text-ink placeholder:text-ink-muted hover:border-ink disabled:opacity-45';
