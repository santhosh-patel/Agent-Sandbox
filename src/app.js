import { initRouter, registerRoute, navigate, onRoute } from './router.js';
import { PlaygroundApp } from './playground-app.js';
import { registerPWA } from './pwa.js';

let playgroundApp = null;
let ragModule = null;

function setView(active) {
  const pg = document.getElementById('playground-view');
  const rag = document.getElementById('rag-view');
  if (pg) pg.hidden = active !== 'playground';
  if (rag) rag.hidden = active !== 'rag';
  document.body.classList.toggle('rag-app-body', active === 'rag');
}

function updateNavPills(path) {
  document.querySelectorAll('[data-route]').forEach(el => {
    const route = el.dataset.route;
    const active = (route === '/' && path === '/') || (route === '/rag' && path === '/rag');
    el.classList.toggle('topnav-pill--active', active);
  });
}

async function mountPlayground() {
  setView('playground');
  document.title = 'AI Playground';
  if (!playgroundApp) {
    playgroundApp = new PlaygroundApp();
    playgroundApp.init();
  }
  updateNavPills('/');
}

async function mountRag() {
  setView('rag');
  document.title = 'RAG Sandbox';
  if (!ragModule) {
    const [{ RagSandboxUI }, { RagHelpUI }] = await Promise.all([
      import('./ui/rag-sandbox.js'),
      import('./ui/rag-help.js'),
    ]);
    const helpUI = new RagHelpUI();
    document.getElementById('rag-topnav-help-btn')?.addEventListener('click', () => helpUI.togglePanel());
    document.getElementById('rag-mobile-help-btn')?.addEventListener('click', () => helpUI.togglePanel());
    document.getElementById('rag-back-pill')?.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('/');
    });
    const sandbox = new RagSandboxUI();
    ragModule = { sandbox, helpUI };
  }
  updateNavPills('/rag');
}

registerRoute('/', mountPlayground);
registerRoute('/rag', mountRag);

window.addEventListener('DOMContentLoaded', () => {
  initRouter('/');
  onRoute(updateNavPills);
  registerPWA();

  document.getElementById('topnav-usage-nav-btn')?.addEventListener('click', () => {
    import('./ui/help-base.js').then(m => m.openUsageWindow());
  });
  document.getElementById('topnav-status-btn')?.addEventListener('click', () => navigate('/rag'));
});

export { navigate };
