import bcrypt from 'bcryptjs';

const COUT_BCRYPT = 12;

export function hacherMotDePasse(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, COUT_BCRYPT);
}

export function verifierMotDePasse(motDePasse: string, hash: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, hash);
}
