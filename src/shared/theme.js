import { state } from '../state.js';
import { setMarkdownTheme } from '../ui/markdown.js';
import { iconHtml } from '../ui/icons.js';
import { setTip } from '../ui/tooltip.js';

export function resolveTheme(theme) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme) {
  const active = resolveTheme(theme);
  document.documentElement.setAttribute('data-theme', active);
  setMarkdownTheme(active);
  return active;
}

export function updateThemeToggleButton(theme, btnId = 'topnav-theme-btn', iconId = 'topnav-theme-icon') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const active = resolveTheme(theme);
  const isDark = active === 'dark';
  btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  setTip(btn, isDark ? 'Switch to light mode' : 'Switch to dark mode');
  const iconEl = document.getElementById(iconId);
  if (iconEl) {
    const iconName = isDark ? 'sun' : 'moon';
    iconEl.outerHTML = iconHtml(iconName, { className: 'icon', size: 18 })
      .replace('<svg', `<svg id="${iconId}"`);
  }
}

export function toggleTheme() {
  const current = state.settings.theme || 'light';
  const resolved = current === 'system' ? resolveTheme('system') : current;
  const next = resolved === 'dark' ? 'light' : 'dark';
  state.updateSettings({ theme: next });
  applyTheme(next);
  updateThemeToggleButton(next, 'topnav-theme-btn', 'topnav-theme-icon');
  updateThemeToggleButton(next, 'rag-theme-btn', 'rag-theme-icon');
  return next;
}

export function bindThemeToggle(btnId = 'topnav-theme-btn', iconId = 'topnav-theme-icon') {
  const btn = document.getElementById(btnId);
  if (!btn || btn.dataset.themeBound) return;
  btn.dataset.themeBound = '1';
  btn.addEventListener('click', () => toggleTheme());
  updateThemeToggleButton(state.settings.theme || 'light', btnId, iconId);
}

export function initTheme() {
  const theme = state.settings.theme || 'light';
  applyTheme(theme);
  bindThemeToggle('topnav-theme-btn', 'topnav-theme-icon');
  bindThemeToggle('rag-theme-btn', 'rag-theme-icon');
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.settings.theme === 'system') {
      applyTheme('system');
      updateThemeToggleButton('system', 'topnav-theme-btn', 'topnav-theme-icon');
      updateThemeToggleButton('system', 'rag-theme-btn', 'rag-theme-icon');
    }
  });
  state.on('settings-changed', (settings) => {
    if (settings.theme) {
      applyTheme(settings.theme);
      updateThemeToggleButton(settings.theme, 'topnav-theme-btn', 'topnav-theme-icon');
      updateThemeToggleButton(settings.theme, 'rag-theme-btn', 'rag-theme-icon');
    }
  });
}
