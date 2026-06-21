const SHOW_DELAY = 320;
const HIDE_DELAY = 60;
const TIP_GAP = 10;
const VIEW_PAD = 8;

let tipEl = null;
let showTimer = null;
let hideTimer = null;
let activeTarget = null;
let initialized = false;

const ELEMENT_TIPS = {
  'topnav-menu-btn': 'Open chat sidebar, folders, and search',
  'topnav-settings-btn': 'Configure provider, model, and API keys',
  'topnav-help-btn': 'Documentation and keyboard shortcuts',
  'topnav-usage-nav-btn': 'Token usage, costs, and session stats',
  'topnav-status-btn': 'Open RAG Sandbox to query your documents',
  'new-chat-btn': 'Start a fresh conversation',
  'sidebar-settings-btn': 'Open settings panel',
  'prompt-library-toggle': 'Browse and reuse saved prompts',
  'sidebar-help-btn': 'Open help documentation',
  'sidebar-usage-btn': 'View usage statistics and estimated costs',
  'new-folder-btn': 'Create a folder to organize chats',
  'attach-image-btn': 'Attach an image to your message',
  'input-settings-btn': 'Quick access to model and provider settings',
  'save-prompt-btn': 'Save the current message to your prompt library',
  'chat-rollback-btn': 'Restore the chat to before your last destructive action',
  'send-btn': 'Send message — press Enter',
  'stop-btn': 'Stop the current response',
  'scroll-bottom-btn': 'Scroll to the latest message',
  'settings-usage-btn': 'Open usage dashboard',
  'settings-close-btn': 'Close settings panel',
  'test-key-btn': 'Test that your API key is valid',
  'toggle-key-visibility': 'Show or hide your API key',
  'favorite-model-btn': 'Pin this model for quick access',
  'refresh-models-btn': 'Fetch the latest model list from the provider',
  'switch-openrouter-btn': 'Switch to OpenRouter — works in-browser with one key',
  'export-all-btn': 'Download all chats as a JSON backup',
  'import-chats-btn': 'Restore chats from a JSON backup file',
  'clear-all-data-btn': 'Delete all chats, keys, and usage history',
  'prompt-library-close': 'Close prompt library',
  'prompt-library-add': 'Create a new saved prompt',
  'sidebar-toggle': 'Open chat sidebar',
  'mobile-help-btn': 'Open help',
  'settings-toggle-mobile': 'Open settings',
  'mobile-status-bar': 'Open settings — tap to configure provider and model',
  'rag-topnav-menu-btn': 'Open knowledge bases and documents',
  'rag-topnav-settings-btn': 'Pipeline settings — embeddings, retrieval, prompts',
  'rag-topnav-help-btn': 'RAG documentation and tips',
  'rag-topnav-usage-btn': 'Embedding and chat usage for this session',
  'rag-back-pill': 'Return to AI Playground',
  'rag-sidebar-toggle': 'Open RAG sidebar',
  'rag-settings-toggle-mobile': 'Open pipeline settings',
  'rag-mobile-help-btn': 'Open RAG help',
  'rag-sidebar-usage-btn': 'View RAG usage statistics',
  'rag-new-collection-btn': 'Create a new knowledge base',
  'rag-import-collection-btn': 'Import a collection from JSON',
  'rag-export-collection-btn': 'Export the active collection as JSON',
  'rag-reindex-btn': 'Re-chunk and re-embed all documents after setting changes',
  'rag-upload-btn': 'Upload PDF, DOCX, TXT, or Markdown files',
  'rag-upload-zone': 'Drop files here to add them to the active collection',
  'rag-settings-usage-btn': 'Open usage dashboard',
  'rag-settings-close-btn': 'Close pipeline settings',
  'rag-test-embed-key-btn': 'Verify embedding API key',
  'rag-test-chat-key-btn': 'Verify chat API key',
  'rag-embedding-key-toggle': 'Show or hide embedding API key',
  'rag-chat-key-toggle': 'Show or hide chat API key',
  'rag-refresh-chat-models-btn': 'Refresh chat models from provider',
  'rag-retrieval-scope-all': 'Search all indexed documents',
  'inspector-close-btn': 'Close message inspector',
  'rag-input-settings-btn': 'Open pipeline settings — provider, model, and keys',
  'rag-send-btn': 'Send message — press Enter',
  'rag-stop-btn': 'Stop answer generation',
  'rag-clear-chat-btn': 'Remove all RAG chat messages (you can roll back afterward)',
  'rag-rollback-btn': 'Restore messages before your last clear or destructive change',
  'chat-title-btn': 'Rename this chat',
  'input-model-pill': 'Active model — click to open settings',
};

const LABEL_TIPS = [
  ['provider-select', 'Which API provider handles your chat requests'],
  ['model-select', 'Model used for new messages in this chat'],
  ['model-search', 'Filter the model list by name or ID'],
  ['profile-select', 'Preset tuning for creativity vs precision'],
  ['system-prompt', 'Instructions the model follows in every reply'],
  ['temperature-input', 'Higher = more creative; lower = more focused'],
  ['max-tokens-input', 'Maximum length of each model response'],
  ['assistant-name-input', 'Name shown in welcome message and exports'],
  ['cors-proxy-input', 'Proxy URL required for some providers in the browser'],
  ['compare-mode-toggle', 'Send the same prompt to up to 3 models at once'],
  ['per-chat-settings-toggle', 'Use different provider/model for this chat only'],
  ['reasoning-mode-toggle', 'Enable extended reasoning for supported models'],
  ['rag-embedding-provider', 'Provider used to embed documents and queries'],
  ['rag-embedding-model', 'Embedding model — must match what indexed your docs'],
  ['rag-chat-provider', 'Provider that generates answers from retrieved context'],
  ['rag-chat-model', 'Chat model that reads retrieved chunks and responds'],
  ['rag-chunk-size', 'Characters per document chunk when indexing'],
  ['rag-chunk-overlap', 'Overlap between chunks to preserve context at boundaries'],
  ['rag-chunk-strategy', 'How text is split — recursive works best for most docs'],
  ['rag-top-k', 'Number of chunks retrieved per question'],
  ['rag-similarity-threshold', 'Minimum match score — lower includes more chunks'],
  ['rag-search-strategy', 'Vector similarity metric for ranking chunks'],
  ['rag-max-context-chars', 'Max characters injected into the prompt from retrieval'],
  ['rag-cors-proxy-url', 'Proxy for providers that block browser requests'],
  ['rag-system-prompt', 'Instructions for the chat model in RAG answers'],
  ['rag-rag-prompt', 'Template with {context} and {question} placeholders'],
  ['rag-temperature', 'Randomness of RAG chat responses'],
  ['rag-max-tokens', 'Max tokens in each RAG answer'],
];

const FILTER_TIPS = {
  all: 'Show all chats',
  pinned: 'Show pinned chats only',
  archived: 'Show archived chats',
};

const PROVIDER_TIPS = {
  openrouter: 'Access 200+ models with one key — best for in-browser use',
  openai: 'GPT-4o, o-series, and embedding models',
  anthropic: 'Claude models — may need a CORS proxy in browser',
  gemini: 'Google Gemini Flash and Pro models',
  groq: 'Fast inference for Llama and Mixtral',
  deepseek: 'DeepSeek V3 chat and reasoner',
};

function ensureTipEl() {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'ui-tooltip';
    tipEl.setAttribute('role', 'tooltip');
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

function clearTimers() {
  if (showTimer) { clearTimeout(showTimer); showTimer = null; }
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
}

function hideTip() {
  clearTimers();
  activeTarget = null;
  if (!tipEl) return;
  tipEl.classList.remove('visible');
  tipEl.hidden = true;
}

function defaultTipPosition(target) {
  if (target.matches('label, .settings-label, .toggle-label-text, .sidebar-section-label')) {
    return 'top';
  }
  return 'bottom';
}

function getTipSize() {
  return tipEl.getBoundingClientRect();
}

function placeTipAt(target, pos, tipW, tipH) {
  const rect = target.getBoundingClientRect();
  let left;
  let top;

  switch (pos) {
    case 'bottom':
      left = rect.left + rect.width / 2 - tipW / 2;
      top = rect.bottom + TIP_GAP;
      break;
    case 'left':
      left = rect.left - tipW - TIP_GAP;
      top = rect.top + rect.height / 2 - tipH / 2;
      break;
    case 'right':
      left = rect.right + TIP_GAP;
      top = rect.top + rect.height / 2 - tipH / 2;
      break;
    default:
      left = rect.left + rect.width / 2 - tipW / 2;
      top = rect.top - tipH - TIP_GAP;
  }

  left = Math.max(VIEW_PAD, Math.min(left, window.innerWidth - tipW - VIEW_PAD));
  top = Math.max(VIEW_PAD, Math.min(top, window.innerHeight - tipH - VIEW_PAD));

  return { left, top };
}

function overlapsRect(a, b, margin = 4) {
  return !(
    a.right + margin < b.left
    || a.left - margin > b.right
    || a.bottom + margin < b.top
    || a.top - margin > b.bottom
  );
}

function positionTip(target) {
  if (!tipEl || tipEl.hidden) return;

  const targetRect = target.getBoundingClientRect();
  const preferred = target.getAttribute('data-tip-pos') || defaultTipPosition(target);
  const fallbacks = [...new Set([preferred, 'bottom', 'top', 'right', 'left'])];
  const { width: tipW, height: tipH } = getTipSize();

  for (const pos of fallbacks) {
    const { left, top } = placeTipAt(target, pos, tipW, tipH);
    const tipRect = { left, top, right: left + tipW, bottom: top + tipH };
    if (!overlapsRect(tipRect, targetRect)) {
      tipEl.style.left = `${Math.round(left)}px`;
      tipEl.style.top = `${Math.round(top)}px`;
      return;
    }
  }

  const { left, top } = placeTipAt(target, preferred, tipW, tipH);
  tipEl.style.left = `${Math.round(left)}px`;
  tipEl.style.top = `${Math.round(top)}px`;
}

function showTip(target) {
  const text = target.getAttribute('data-tip')?.trim();
  if (!text) return;

  clearTimers();
  activeTarget = target;
  const el = ensureTipEl();
  el.textContent = text;
  el.hidden = false;
  el.classList.remove('visible');
  el.style.visibility = 'hidden';
  requestAnimationFrame(() => {
    positionTip(target);
    el.style.visibility = '';
    el.classList.add('visible');
  });
}

function scheduleShow(target) {
  if (activeTarget === target && tipEl?.classList.contains('visible')) return;
  clearTimers();
  hideTip();
  showTimer = setTimeout(() => showTip(target), SHOW_DELAY);
}

function scheduleHide() {
  clearTimers();
  hideTimer = setTimeout(hideTip, HIDE_DELAY);
}

function findTipTarget(from) {
  return from?.closest?.('[data-tip]') || null;
}

function onPointerOver(e) {
  const target = findTipTarget(e.target);
  if (!target) return;
  if (target !== activeTarget) scheduleShow(target);
}

function onPointerOut(e) {
  const target = findTipTarget(e.target);
  if (!target) return;
  const related = findTipTarget(e.relatedTarget);
  if (related === target) return;
  scheduleHide();
}

function onFocusIn(e) {
  const target = findTipTarget(e.target);
  if (target) scheduleShow(target);
}

function onFocusOut(e) {
  const target = findTipTarget(e.target);
  if (!target) return;
  const related = findTipTarget(e.relatedTarget);
  if (related === target) return;
  scheduleHide();
}

function onScroll() {
  if (activeTarget && tipEl?.classList.contains('visible')) {
    positionTip(activeTarget);
  }
}

function onPointerDown() {
  hideTip();
}

export function rollbackTip(label) {
  const mod = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
  if (label?.trim()) return `Roll back: ${label.trim()} (${mod}+Z)`;
  return `Roll back last change (${mod}+Z)`;
}

export function setTip(el, text, pos) {
  if (!el) return;
  if (text) {
    el.setAttribute('data-tip', text);
    if (pos) el.setAttribute('data-tip-pos', pos);
    else el.removeAttribute('data-tip-pos');
    el.removeAttribute('title');
  } else {
    el.removeAttribute('data-tip');
    el.removeAttribute('data-tip-pos');
  }
}

export function applyDefaultTooltips() {
  for (const [id, text] of Object.entries(ELEMENT_TIPS)) {
    const el = document.getElementById(id);
    if (el && !el.hasAttribute('data-tip')) setTip(el, text);
  }

  for (const [id, text] of Object.entries(LABEL_TIPS)) {
    const el = document.getElementById(id);
    if (el && !el.hasAttribute('data-tip')) setTip(el, text, 'right');
  }

  document.querySelectorAll('.filter-tab[data-filter]').forEach(btn => {
    const tip = FILTER_TIPS[btn.dataset.filter];
    if (tip && !btn.hasAttribute('data-tip')) setTip(btn, tip);
  });

  document.querySelectorAll('.provider-chip[data-provider]').forEach(btn => {
    const tip = PROVIDER_TIPS[btn.dataset.provider];
    if (tip && !btn.hasAttribute('data-tip')) setTip(btn, tip, 'bottom');
  });

  document.querySelectorAll('.toggle-row input[id]').forEach(input => {
    const match = LABEL_TIPS.find(([id]) => id === input.id);
    const label = input.closest('.toggle-row')?.querySelector('.toggle-label-text');
    if (match && label && !label.hasAttribute('data-tip')) setTip(label, match[1]);
  });

  document.querySelectorAll('.session-badge').forEach(el => {
    if (!el.hasAttribute('data-tip')) setTip(el, 'All data stays in your browser — nothing sent to our servers');
  });

  document.getElementById('search-scope-btn') && setTip(
    document.getElementById('search-scope-btn'),
    'Searching titles and message content — click for titles only',
  );

  for (const id of ['chat-rollback-btn', 'rag-rollback-btn']) {
    const el = document.getElementById(id);
    if (el && ELEMENT_TIPS[id]) setTip(el, ELEMENT_TIPS[id], 'bottom');
  }

  document.querySelectorAll('[title]').forEach(el => {
    if (el.hasAttribute('data-tip')) el.removeAttribute('title');
    else if (!el.closest('.usage-chart-bar')) {
      const title = el.getAttribute('title');
      if (title) {
        setTip(el, title);
        el.removeAttribute('title');
      }
    }
  });
}

export function initTooltips() {
  if (initialized) return;
  initialized = true;

  document.addEventListener('mouseover', onPointerOver);
  document.addEventListener('mouseout', onPointerOut);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  document.addEventListener('mousedown', onPointerDown, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTip();
  });
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onScroll);

  applyDefaultTooltips();
}
