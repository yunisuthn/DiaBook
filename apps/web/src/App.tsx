import { Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { RouteProtegee } from './components/RouteProtegee';
import { Connexion } from './pages/Connexion';
import { Creances } from './pages/Creances';
import { Importer } from './pages/Importer';
import { Journees } from './pages/Journees';
import { Lot } from './pages/Lot';
import { Parametres } from './pages/Parametres';
import { TableauDeBord } from './pages/TableauDeBord';

export function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Connexion />} />
      <Route element={<RouteProtegee />}>
        <Route element={<Layout />}>
          <Route index element={<TableauDeBord />} />
          <Route path="journees" element={<Journees />} />
          <Route path="importer" element={<Importer />} />
          <Route path="lots/:id" element={<Lot />} />
          <Route path="creances" element={<Creances />} />
          <Route path="parametres" element={<Parametres />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
