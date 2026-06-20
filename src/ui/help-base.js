import { modKeyLabel } from './icons.js';

export function createHelpPanel({ title, lead, sections, onClose }) {
  const mod = modKeyLabel();
  const panel = document.createElement('div');
  panel.className = 'help-panel visible';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'help-panel-title');

  panel.innerHTML = `
    <div class="help-content help-docs">
      <header class="help-docs-header">
        <div class="help-docs-header-text">
          <p class="help-docs-eyebrow">Documentation</p>
          <h2 id="help-panel-title">${title}</h2>
          ${lead ? `<p class="help-docs-lead">${lead}</p>` : ''}
        </div>
        <button type="button" class="btn-text help-close" aria-label="Close documentation">Close</button>
      </header>
      <div class="help-docs-layout">
        <nav class="help-docs-toc" aria-label="Documentation sections">
          ${sections.map(s => `
            <a href="#help-${s.id}" class="help-docs-toc-link" data-section="${s.id}">${s.label}</a>
          `).join('')}
        </nav>
        <div class="help-docs-main">
          ${sections.map(s => `
            <section class="help-doc-section" id="help-${s.id}">
              <h3>${s.label}</h3>
              ${s.body}
            </section>
          `).join('')}
          <section class="help-doc-section" id="help-shortcuts">
            <h3>Keyboard shortcuts</h3>
            <div class="shortcuts-list">
              <div class="shortcut-row"><kbd>/</kbd><span>Focus message input</span></div>
              <div class="shortcut-row"><kbd>${mod}</kbd><kbd>K</kbd><span>Search chats</span></div>
              <div class="shortcut-row"><kbd>${mod}</kbd><kbd>,</kbd><span>Toggle settings</span></div>
              <div class="shortcut-row"><kbd>Esc</kbd><span>Close panel / stop</span></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;

  const close = () => {
    panel.classList.remove('visible');
    document.removeEventListener('keydown', onKeydown);
    setTimeout(() => {
      panel.remove();
      if (onClose) onClose();
    }, 200);
  };

  const onKeydown = (e) => {
    if (e.key === 'Escape') close();
  };

  panel.querySelector('.help-close')?.addEventListener('click', close);
  panel.addEventListener('click', (e) => {
    if (e.target === panel) close();
  });

  panel.querySelectorAll('.help-docs-toc-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('href')?.slice(1);
      const el = id ? panel.querySelector(`#${id}`) : null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.addEventListener('keydown', onKeydown);
  document.body.appendChild(panel);
  return { panel, close };
}

export function openUsageWindow() {
  window.open('/usage.html', 'usage', 'width=760,height=680,scrollbars=yes');
}
