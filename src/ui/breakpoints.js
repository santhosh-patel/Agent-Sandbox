export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1100,
};

export function isMobile() {
  return window.matchMedia(`(max-width: ${BREAKPOINTS.mobile}px)`).matches;
}

export function isTablet() {
  return window.matchMedia(`(max-width: ${BREAKPOINTS.tablet}px)`).matches;
}

export function onViewportChange(fn) {
  const handler = () => fn({ mobile: isMobile(), tablet: isTablet() });
  window.addEventListener('resize', handler);
  window.matchMedia(`(max-width: ${BREAKPOINTS.mobile}px)`).addEventListener('change', handler);
  window.matchMedia(`(max-width: ${BREAKPOINTS.tablet}px)`).addEventListener('change', handler);
  return handler;
}

export function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('visible');
  document.body.classList.remove('sidebar-open');
}

export function closeSettingsPanel() {
  const panel = document.getElementById('settings-panel');
  const overlay = document.getElementById('overlay');
  if (panel) panel.classList.add('collapsed');
  document.body.classList.add('settings-collapsed');
  if (overlay) overlay.classList.remove('visible');
  const toggle = document.getElementById('settings-edge-toggle');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}
