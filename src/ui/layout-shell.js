export function bindPanelCollapse({
  panel,
  overlay,
  edgeToggle,
  collapseBtn,
  closeBtn,
  storageKey,
  isOverlayMode = () => false,
  onCollapse,
  onExpand,
}) {
  const setCollapsed = (collapsed) => {
    panel?.classList.toggle('collapsed', collapsed);
    document.body.classList.toggle(`${storageKey}-collapsed`, collapsed);
    if (edgeToggle) {
      edgeToggle.setAttribute('aria-expanded', String(!collapsed));
      edgeToggle.setAttribute('aria-label', collapsed ? 'Expand panel' : 'Collapse panel');
    }
    localStorage.setItem(storageKey, collapsed);
    if (collapsed && onCollapse) onCollapse();
    if (!collapsed && onExpand) onExpand();
  };

  const toggle = () => setCollapsed(!panel?.classList.contains('collapsed'));

  edgeToggle?.addEventListener('click', toggle);
  collapseBtn?.addEventListener('click', () => {
    if (!isOverlayMode()) setCollapsed(true);
  });
  closeBtn?.addEventListener('click', () => setCollapsed(true));
  overlay?.addEventListener('click', () => setCollapsed(true));

  const stored = localStorage.getItem(storageKey);
  const collapsed = stored !== null ? stored === 'true' : isOverlayMode();
  setCollapsed(collapsed);

  return { setCollapsed, toggle };
}
