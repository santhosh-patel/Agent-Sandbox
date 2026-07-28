import { APP_NAME, RAG_LABEL } from './shared/branding.js';
import { initRouter, registerRoute, navigate, onRoute } from './router.js';
import { PlaygroundApp } from './playground-app.js';
import { registerPWA } from './pwa.js';
import { openUsageWindow } from './ui/help-base.js';
import { initTooltips } from './ui/tooltip.js';

let playgroundApp = null;
let ragModule = null;
let landingModule = null;

function setView(active) {
  const landing = document.getElementById('landing-view');
  const pg = document.getElementById('playground-view');
  const rag = document.getElementById('rag-view');
  if (landing) landing.hidden = active !== 'landing';
  if (pg) pg.hidden = active !== 'playground';
  if (rag) rag.hidden = active !== 'rag';
  document.body.classList.toggle('rag-app-body', active === 'rag');
  document.body.classList.toggle('landing-body', active === 'landing');
}

function updateNavPills(path) {
  document.querySelectorAll('[data-route]').forEach(el => {
    const route = el.dataset.route;
    const active = (route === '/app' && path === '/app') || (route === '/rag' && path === '/rag');
    el.classList.toggle('topnav-pill--active', active);
  });
}

function syncLayoutBodyClasses(view) {
  if (view === 'playground') {
    const sidebar = document.getElementById('sidebar');
    const settings = document.getElementById('settings-panel');
    document.body.classList.toggle('sidebar-collapsed', !!sidebar?.classList.contains('collapsed'));
    document.body.classList.toggle('settings-collapsed', !!settings?.classList.contains('collapsed'));
    return;
  }

  if (view === 'rag') {
    const sidebar = document.getElementById('rag-sidebar');
    const settings = document.getElementById('rag-settings-panel');
    document.body.classList.toggle('sidebar-collapsed', !!sidebar?.classList.contains('collapsed'));
    document.body.classList.toggle('settings-collapsed', !!settings?.classList.contains('collapsed'));
  }
}

async function mountLanding() {
  setView('landing');
  document.title = APP_NAME;

  if (!landingModule) {
    landingModule = await import('./landing/landing.js');
  }

  await landingModule.mountLanding({
    onApp: () => navigate('/app'),
    onRag: () => navigate('/rag'),
  });
}

async function mountPlayground() {
  landingModule?.unmountLanding?.();
  setView('playground');
  document.title = APP_NAME;
  if (!playgroundApp) {
    playgroundApp = new PlaygroundApp();
    playgroundApp.init();
  }
  syncLayoutBodyClasses('playground');
  updateNavPills('/app');
}

async function mountRag() {
  landingModule?.unmountLanding?.();
  setView('rag');
  document.title = `${RAG_LABEL} · ${APP_NAME}`;
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
      navigate('/app');
    });
    const sandbox = new RagSandboxUI();
    ragModule = { sandbox, helpUI };
  }
  syncLayoutBodyClasses('rag');
  updateNavPills('/rag');
}

registerRoute('/', mountLanding);
registerRoute('/app', mountPlayground);
registerRoute('/rag', mountRag);

window.addEventListener('DOMContentLoaded', () => {
  initTooltips();
  initRouter('/');
  onRoute(updateNavPills);
  registerPWA();

  document.getElementById('topnav-usage-nav-btn')?.addEventListener('click', () => openUsageWindow());
  document.getElementById('topnav-status-btn')?.addEventListener('click', () => navigate('/rag'));
});

export { navigate };
