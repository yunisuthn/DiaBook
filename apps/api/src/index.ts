import { creerApp } from './app.js';
import { config } from './config.js';
import { reprendreExtractions } from './extraction/index.js';

creerApp().listen(config.PORT, () => {
  console.log(`API DiaBook démarrée sur http://localhost:${config.PORT}`);
  reprendreExtractions().catch((erreur: unknown) => {
    console.error('Reprise des extractions impossible :', erreur);
  });
});
