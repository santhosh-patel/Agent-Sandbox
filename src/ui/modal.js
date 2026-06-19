let activeModal = null;

export function showConfirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', destructive = false }) {
  return new Promise((resolve) => {
    closeModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay visible';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h3 class="modal-title" id="modal-title">${escapeHtml(title)}</h3>
        <p class="modal-message">${escapeHtml(message)}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost modal-cancel">${escapeHtml(cancelText)}</button>
          <button type="button" class="btn ${destructive ? 'btn-danger' : 'btn-primary'} modal-confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    const cancelBtn = overlay.querySelector('.modal-cancel');
    const confirmBtn = overlay.querySelector('.modal-confirm');

    const finish = (result) => {
      closeModal();
      resolve(result);
    };

    cancelBtn.addEventListener('click', () => finish(false));
    confirmBtn.addEventListener('click', () => finish(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });

    document.body.appendChild(overlay);
    activeModal = overlay;
    confirmBtn.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
    };
    document.addEventListener('keydown', onKey, { once: true });
  });
}

export function showPrompt({ title, message = '', defaultValue = '', confirmText = 'Save', cancelText = 'Cancel', placeholder = '', multiline = false }) {
  return new Promise((resolve) => {
    closeModal();

    const inputTag = multiline
      ? `<textarea class="modal-input modal-textarea" rows="4" placeholder="${escapeHtml(placeholder)}">${escapeHtml(defaultValue)}</textarea>`
      : `<input type="text" class="modal-input" value="${escapeAttr(defaultValue)}" placeholder="${escapeHtml(placeholder)}" />`;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay visible';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h3 class="modal-title" id="modal-title">${escapeHtml(title)}</h3>
        ${message ? `<p class="modal-message">${escapeHtml(message)}</p>` : ''}
        ${inputTag}
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost modal-cancel">${escapeHtml(cancelText)}</button>
          <button type="button" class="btn btn-primary modal-confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    const input = overlay.querySelector('.modal-input');
    const cancelBtn = overlay.querySelector('.modal-cancel');
    const confirmBtn = overlay.querySelector('.modal-confirm');

    const finish = (result) => {
      closeModal();
      resolve(result);
    };

    const submit = () => finish(input.value);

    cancelBtn.addEventListener('click', () => finish(null));
    confirmBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !multiline) { e.preventDefault(); submit(); }
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(null); });

    document.body.appendChild(overlay);
    activeModal = overlay;
    input.focus();
    if (!multiline) input.select();

    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); finish(null); }
    });
  });
}

export function closeModal() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/'/g, '&#39;');
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
