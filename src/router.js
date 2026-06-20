const routes = new Map();
let currentPath = '';

function normalizePath(path) {
  if (!path || path === '/') return '/';
  const p = path.replace(/\/+$/, '') || '/';
  return p.startsWith('/') ? p : `/${p}`;
}

export function registerRoute(path, handler) {
  routes.set(normalizePath(path), handler);
}

export function getRoute() {
  return currentPath || normalizePath(window.location.pathname);
}

export function navigate(path, { replace = false } = {}) {
  const normalized = normalizePath(path);
  if (normalized === currentPath) return;
  if (replace) {
    history.replaceState({ path: normalized }, '', normalized);
  } else {
    history.pushState({ path: normalized }, '', normalized);
  }
  currentPath = normalized;
  runRoute(normalized);
}

async function runRoute(path) {
  const handler = routes.get(path) || routes.get('/');
  if (handler) await handler(path);
  document.dispatchEvent(new CustomEvent('route-changed', { detail: { path } }));
}

export function initRouter(defaultPath = '/') {
  currentPath = normalizePath(window.location.pathname);
  if (!routes.has(currentPath)) {
    history.replaceState({ path: defaultPath }, '', defaultPath);
    currentPath = defaultPath;
  }
  window.addEventListener('popstate', () => {
    currentPath = normalizePath(window.location.pathname);
    runRoute(currentPath);
  });
  runRoute(currentPath);
}

export function onRoute(fn) {
  document.addEventListener('route-changed', (e) => fn(e.detail.path));
  fn(getRoute());
}
