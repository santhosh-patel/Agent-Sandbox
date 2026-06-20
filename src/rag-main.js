import { RagSandboxUI } from './ui/rag-sandbox.js';
import { setMarkdownTheme } from './ui/markdown.js';

function applyTheme(theme) {
  let active = theme;
  if (theme === 'system') {
    active = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', active);
  setMarkdownTheme(active);
}

function loadTheme() {
  try {
    const raw = localStorage.getItem('ai-playground-state');
    if (raw) {
      const parsed = JSON.parse(raw);
      const theme = parsed.settings?.theme;
      if (theme) return theme;
    }
  } catch { /* ignore */ }
  return 'light';
}

window.addEventListener('DOMContentLoaded', () => {
  applyTheme(loadTheme());
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const theme = loadTheme();
    if (theme === 'system') applyTheme('system');
  });
  new RagSandboxUI();
});
