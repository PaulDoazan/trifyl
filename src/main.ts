import './styles/reset.css';
import './styles/theme.css';
import './styles/menu.css';
import './styles/overlays.css';
import './styles/screens.css';

import { App } from './app/App';

const root = document.getElementById('app');
if (!root) throw new Error('#app element not found');

const app = new App(root);
app.start().catch((err) => {
  console.error('Trifyl failed to start', err);
  root.textContent = 'Erreur de démarrage. Voir la console.';
});
