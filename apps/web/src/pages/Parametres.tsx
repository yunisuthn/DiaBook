import { EnTetePage } from '../components/EnTetePage';
import { SectionCamions } from '../components/parametres/SectionCamions';
import { SectionPersonnes } from '../components/parametres/SectionPersonnes';

export function Parametres() {
  return (
    <div className="space-y-6">
      <EnTetePage titre="Paramètres">Camions, chauffeurs et receveurs.</EnTetePage>
      <SectionCamions />
      <SectionPersonnes />
    </div>
  );
}
