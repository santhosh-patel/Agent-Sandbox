import { RagSandboxUI } from './ui/rag-sandbox.js';
import { HelpUI } from './ui/help.js';
import { setMarkdownTheme } from './ui/markdown.js';
import { iconHtml } from './ui/icons.js';

const STORAGE_KEY = 'ai-playground-state';

function resolveTheme(theme) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme === 'dark' ? 'dark' : 'light';
}

function loadTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.settings?.theme) return parsed.settings.theme;
    }
  } catch { /* ignore */ }
  return 'light';
}

function saveTheme(theme) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : { settings: {} };
    data.settings = { ...data.settings, theme };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function applyTheme(theme) {
  const active = resolveTheme(theme);
  document.documentElement.setAttribute('data-theme', active);
  setMarkdownTheme(active);
}

function updateThemeToggleButton(theme) {
  const btn = document.getElementById('rag-theme-btn');
  if (!btn) return;

  const active = resolveTheme(theme);
  const isDark = active === 'dark';
  btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  btn.title = isDark ? 'Light mode' : 'Dark mode';

  const iconEl = document.getElementById('rag-theme-icon');
  if (iconEl) {
    const iconName = isDark ? 'sun' : 'moon';
    iconEl.outerHTML = iconHtml(iconName, { className: 'icon', size: 18 })
      .replace('<svg', '<svg id="rag-theme-icon"');
  }
}

function toggleTheme() {
  const current = loadTheme();
  const resolved = current === 'system' ? resolveTheme('system') : current;
  const next = resolved === 'dark' ? 'light' : 'dark';
  saveTheme(next);
  applyTheme(next);
  updateThemeToggleButton(next);
}

function bindThemeToggle() {
  const btn = document.getElementById('rag-theme-btn');
  if (!btn) return;
  btn.addEventListener('click', () => toggleTheme());
  updateThemeToggleButton(loadTheme());
}

window.addEventListener('DOMContentLoaded', () => {
  applyTheme(loadTheme());
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (loadTheme() === 'system') applyTheme('system');
  });
  bindThemeToggle();
  const helpUI = new HelpUI();
  document.getElementById('rag-topnav-help-btn')?.addEventListener('click', () => helpUI.togglePanel());
  document.getElementById('rag-mobile-help-btn')?.addEventListener('click', () => helpUI.togglePanel());
  new RagSandboxUI();
});
