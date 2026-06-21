/**
 * Excel-style drag handles for resizable side panels.
 */

export const PANEL_SIZE_DEFAULTS = {
  sidebar: { base: 260, maxRatio: 1.5 },
  settings: { base: 360, maxRatio: 1.5 },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function initAppPanelResize({
  root,
  sidebarEl,
  settingsEl,
  prefix,
  enabled = () => true,
  sidebarLabel = 'Resize sidebar',
  settingsLabel = 'Resize settings panel',
}) {
  if (!root || !sidebarEl || !settingsEl) return () => {};

  const { sidebar, settings } = PANEL_SIZE_DEFAULTS;
  return initPanelResize({
    root,
    enabled,
    panels: [
      {
        el: sidebarEl,
        cssVar: `--${prefix}-sidebar-width`,
        storageKey: `${prefix}-sidebar-width`,
        min: sidebar.base,
        max: Math.round(sidebar.base * sidebar.maxRatio),
        edge: 'right',
        label: sidebarLabel,
      },
      {
        el: settingsEl,
        cssVar: `--${prefix}-settings-width`,
        storageKey: `${prefix}-settings-width`,
        min: settings.base,
        max: Math.round(settings.base * settings.maxRatio),
        edge: 'left',
        label: settingsLabel,
      },
    ],
  });
}

export function initPanelResize({ root, panels, enabled = () => true }) {
  const cleanups = [];

  panels.forEach((config) => {
    if (!config.el || !root) return;

    const handle = document.createElement('div');
    handle.className = `panel-resize-handle panel-resize-handle--${config.edge}`;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', config.label || 'Resize panel');
    handle.tabIndex = 0;
    config.el.appendChild(handle);

    const apply = (width) => {
      const clamped = clamp(Math.round(width), config.min, config.max);
      root.style.setProperty(config.cssVar, `${clamped}px`);
      localStorage.setItem(config.storageKey, String(clamped));
      return clamped;
    };

    const readCurrent = () => {
      const fromStyle = parseInt(getComputedStyle(root).getPropertyValue(config.cssVar), 10);
      if (Number.isFinite(fromStyle)) return fromStyle;
      const stored = parseInt(localStorage.getItem(config.storageKey), 10);
      if (Number.isFinite(stored)) return stored;
      return config.min;
    };

    const stored = parseInt(localStorage.getItem(config.storageKey), 10);
    apply(Number.isFinite(stored) ? stored : config.min);

    const measureWidth = (clientX) => {
      const rect = config.el.getBoundingClientRect();
      return config.edge === 'right' ? clientX - rect.left : rect.right - clientX;
    };

    const startDrag = (clientX) => {
      if (!enabled()) return;

      handle.classList.add('is-dragging');
      document.body.classList.add('panel-resizing');

      const onMove = (e) => {
        const x = e.clientX ?? e.touches?.[0]?.clientX;
        if (x == null) return;
        e.preventDefault?.();
        apply(measureWidth(x));
      };

      const onEnd = () => {
        handle.classList.remove('is-dragging');
        document.body.classList.remove('panel-resizing');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
        document.removeEventListener('touchcancel', onEnd);
      };

      apply(measureWidth(clientX));
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
      document.addEventListener('touchcancel', onEnd);
    };

    handle.addEventListener('mousedown', (e) => {
      if (!enabled()) return;
      e.preventDefault();
      startDrag(e.clientX);
    });

    handle.addEventListener('touchstart', (e) => {
      if (!enabled()) return;
      e.preventDefault();
      startDrag(e.touches[0].clientX);
    }, { passive: false });

    handle.addEventListener('keydown', (e) => {
      if (!enabled()) return;
      const step = e.shiftKey ? 16 : 8;
      const current = readCurrent();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        apply(config.edge === 'right' ? current - step : current + step);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        apply(config.edge === 'right' ? current + step : current - step);
      }
    });

    cleanups.push(() => handle.remove());
  });

  return () => cleanups.forEach((fn) => fn());
}
