import { ragState } from '../rag/rag-state.js';
import { RAG_PROVIDERS, EMBEDDING_PROVIDERS, CHAT_PROVIDERS } from '../rag/rag-providers.js';
import { chunkText } from '../rag/chunker.js';
import { createEmbeddings, validateApiKey, listChatModels, estimateEmbeddingCost } from '../rag/embeddings.js';
import { searchChunks, buildContext, formatRagPrompt } from '../rag/retriever.js';
import { parseDocument, isSupportedFile } from '../rag/document-parser.js';
import { createProvider, estimateCost } from '../providers/registry.js';
import { renderMarkdown } from './markdown.js';
import { showToast } from './toast.js';
import { showConfirm, showPrompt } from './modal.js';
import { iconHtml } from './icons.js';
import { isMobile, isTablet, onViewportChange } from './breakpoints.js';
import { RagEvalUI } from './rag-eval.js';
import { estimateStorageBytes, formatBytes } from '../rag/rag-db.js';
import { credentials } from '../shared/credentials.js';
import { openUsageWindow } from './help-base.js';
import { setTip } from './tooltip.js';
import { bindThemeToggle } from '../shared/theme.js';

export class RagSandboxUI {
  constructor() {
    this.root = document.getElementById('rag-app');
    this.sidebar = document.getElementById('rag-sidebar');
    this.settingsPanel = document.getElementById('rag-settings-panel');
    this.sidebarOverlay = document.getElementById('rag-sidebar-overlay');
    this.overlay = document.getElementById('rag-overlay');
    this.sidebarEdgeToggle = document.getElementById('rag-sidebar-edge-toggle');
    this.settingsEdgeToggle = document.getElementById('rag-settings-edge-toggle');
    this.abortController = null;
    this.indexing = false;
    this.init();
  }

  init() {
    if (!this.root || !this.sidebar) return;
    ragState.applySharedDefaults();
    ragState.initFromDb().then(() => {
      this.renderCollections();
      this.renderDocuments();
      this.renderStorageMeter();
    });
    this.bindEvents();
    this.bindLayout();
    this.bindSetupCard();
    bindThemeToggle('rag-theme-btn', 'rag-theme-icon');
    this.renderCollections();
    this.renderDocuments();
    this.renderSettings();
    this.renderMessages();
    this.renderUsage();
    this.renderSettingsUsageSummary();
    this.evalUI = new RagEvalUI();
    this.renderStorageMeter();
  }

  bindSetupCard() {
    const card = document.getElementById('rag-setup-card');
    if (!card) return;
    const update = () => {
      const s = ragState.settings;
      const dismissed = localStorage.getItem('rag-onboarding-dismissed') === '1';
      const issues = ragState.getSetupIssues();
      card.hidden = dismissed && issues.length === 0;
      const stepsEl = document.getElementById('rag-setup-steps');
      if (stepsEl) {
        const steps = [
          { label: 'Select embedding provider & model', done: !!(s.embeddingProvider && s.embeddingModel) },
          { label: 'Add embedding API key', done: ragState.hasApiKey(s.embeddingProvider) },
          { label: 'Select chat provider & model', done: !!(s.chatProvider && s.chatModel) },
          { label: 'Add chat API key', done: ragState.hasApiKey(s.chatProvider) },
        ];
        stepsEl.innerHTML = steps.map(step => `
          <li class="${step.done ? 'setup-step--done' : 'setup-step--pending'}">${step.label}</li>
        `).join('');
      }
    };
    update();
    ragState.on('settings-changed', update);
    ragState.on('apikey-changed', update);
    document.getElementById('rag-setup-settings-btn')?.addEventListener('click', () => this.expandSettingsPanel());
    document.getElementById('rag-import-keys-btn')?.addEventListener('click', () => {
      ragState.applySharedDefaults();
      const providers = credentials.getConfiguredProviders();
      showToast(providers.length ? `Found keys for: ${providers.join(', ')}` : 'No saved keys found');
      update();
    });
    document.getElementById('rag-setup-dismiss-btn')?.addEventListener('click', () => {
      localStorage.setItem('rag-onboarding-dismissed', '1');
      card.hidden = true;
    });
  }

  async renderStorageMeter() {
    const el = document.getElementById('rag-storage-meter');
    if (!el) return;
    const collection = ragState.getActiveCollection();
    const docCount = collection?.documents?.length || 0;
    const chunkCount = collection ? ragState.getAllChunks(collection.id).length : 0;
    const bytes = await estimateStorageBytes();
    el.textContent = `${docCount} docs · ${chunkCount} chunks · ${formatBytes(bytes)}`;
  }

  bindEvents() {
    document.getElementById('rag-new-collection-btn')?.addEventListener('click', () => this.handleNewCollection());
    document.getElementById('rag-import-collection-btn')?.addEventListener('click', () => this.handleImportCollection());
    document.getElementById('rag-export-collection-btn')?.addEventListener('click', () => this.handleExportCollection());
    document.getElementById('rag-reindex-btn')?.addEventListener('click', () => this.reindexCollection());
    document.getElementById('rag-file-input')?.addEventListener('change', (e) => this.handleFileUpload(e));
    document.getElementById('rag-upload-btn')?.addEventListener('click', () => document.getElementById('rag-file-input')?.click());
    document.getElementById('rag-upload-zone')?.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.currentTarget.classList.add('drag-over');
    });
    document.getElementById('rag-upload-zone')?.addEventListener('dragleave', (e) => {
      e.currentTarget.classList.remove('drag-over');
    });
    document.getElementById('rag-upload-zone')?.addEventListener('drop', (e) => {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');
      this.handleFileDrop(e);
    });

    document.getElementById('rag-send-btn')?.addEventListener('click', () => this.handleSend());
    document.getElementById('rag-stop-btn')?.addEventListener('click', () => this.handleStop());
    document.getElementById('rag-message-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
    document.getElementById('rag-message-input')?.addEventListener('input', (e) => {
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    });
    document.getElementById('rag-clear-chat-btn')?.addEventListener('click', () => {
      ragState.clearMessages();
      this.renderMessages();
    });

    this.bindUsageButtons();

    this.bindSettingsEvents();

    ragState.on('collections-changed', () => {
      this.renderCollections();
      this.renderDocuments();
    });
    ragState.on('collection-changed', () => {
      this.renderCollections();
      this.renderDocuments();
      this.renderMessages();
    });
    ragState.on('documents-changed', () => {
      this.renderDocuments();
      this.renderStorageMeter();
      this.renderRetrievalScope();
    });
    ragState.on('settings-changed', () => this.renderSettings());
    ragState.on('message-added', () => this.renderMessages());
    ragState.on('message-updated', () => this.renderMessages());
    ragState.on('messages-cleared', () => this.renderMessages());
    ragState.on('usage-changed', () => {
      this.renderUsage();
      this.renderSettingsUsageSummary();
    });
    ragState.on('apikey-changed', () => this.syncKeyFields());
  }

  bindLayout() {
    document.getElementById('rag-topnav-menu-btn')?.addEventListener('click', () => this.toggleSidebar());
    document.getElementById('rag-topnav-settings-btn')?.addEventListener('click', () => this.toggleSettingsPanel());
    document.getElementById('rag-sidebar-toggle')?.addEventListener('click', () => this.toggleSidebar());
    document.getElementById('rag-settings-toggle-mobile')?.addEventListener('click', () => this.toggleSettingsPanel());
    document.getElementById('rag-mobile-status-bar')?.addEventListener('click', () => this.expandSettingsPanel());

    document.getElementById('rag-sidebar-collapse-btn')?.addEventListener('click', () => {
      if (!isMobile()) this.setSidebarCollapsed(true);
    });
    document.getElementById('rag-settings-collapse-btn')?.addEventListener('click', () => {
      if (!this.isOverlayMode()) this.collapseSettingsPanel();
    });
    document.getElementById('rag-settings-close-btn')?.addEventListener('click', () => this.collapseSettingsPanel());

    this.sidebarEdgeToggle?.addEventListener('click', () => this.toggleSidebar());
    this.settingsEdgeToggle?.addEventListener('click', () => this.toggleSettingsPanel());
    this.sidebarOverlay?.addEventListener('click', () => this.closeMobileSidebar());
    this.overlay?.addEventListener('click', () => this.collapseSettingsPanel());

    const storedSidebar = localStorage.getItem('rag-sidebar-collapsed');
    const storedSettings = localStorage.getItem('rag-settings-collapsed');
    const sidebarCollapsed = storedSidebar !== null ? storedSidebar === 'true' : false;
    const settingsCollapsed = storedSettings !== null ? storedSettings === 'true' : this.isOverlayMode();

    this.setSidebarCollapsed(sidebarCollapsed);
    this.setSettingsCollapsed(settingsCollapsed);

    onViewportChange(({ mobile }) => {
      if (!mobile) this.closeMobileSidebar();
      if (!this.isOverlayMode() && this.overlay) this.overlay.classList.remove('visible');
    });
  }

  isOverlayMode() {
    return isTablet();
  }

  openMobileSidebar() {
    this.collapseSettingsPanel();
    this.sidebar?.classList.add('open');
    this.sidebarOverlay?.classList.add('visible');
    document.body.classList.add('sidebar-open');
    this.updateTopnavState();
  }

  closeMobileSidebar() {
    this.sidebar?.classList.remove('open');
    this.sidebarOverlay?.classList.remove('visible');
    document.body.classList.remove('sidebar-open');
    this.updateTopnavState();
  }

  toggleSidebar() {
    if (isMobile()) {
      if (this.sidebar?.classList.contains('open')) this.closeMobileSidebar();
      else this.openMobileSidebar();
    } else {
      this.setSidebarCollapsed(!this.sidebar?.classList.contains('collapsed'));
    }
  }

  setSidebarCollapsed(collapsed) {
    this.sidebar?.classList.toggle('collapsed', collapsed);
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
    if (this.sidebarEdgeToggle) {
      this.sidebarEdgeToggle.setAttribute('aria-expanded', String(!collapsed));
      this.sidebarEdgeToggle.setAttribute('aria-label', label);
      this.sidebarEdgeToggle.title = label;
    }
    const collapseBtn = document.getElementById('rag-sidebar-collapse-btn');
    if (collapseBtn) {
      collapseBtn.setAttribute('aria-label', label);
      collapseBtn.title = label;
    }
    localStorage.setItem('rag-sidebar-collapsed', collapsed);
    this.updateTopnavState();
  }

  expandSettingsPanel() {
    if (this.isOverlayMode()) this.closeMobileSidebar();
    this.setSettingsCollapsed(false);
  }

  collapseSettingsPanel() {
    this.setSettingsCollapsed(true);
  }

  toggleSettingsPanel() {
    this.setSettingsCollapsed(!this.settingsPanel?.classList.contains('collapsed'));
  }

  setSettingsCollapsed(collapsed) {
    this.settingsPanel?.classList.toggle('collapsed', collapsed);
    document.body.classList.toggle('settings-collapsed', collapsed);
    const label = collapsed ? 'Expand settings' : 'Collapse settings';
    if (this.settingsEdgeToggle) {
      this.settingsEdgeToggle.setAttribute('aria-expanded', String(!collapsed));
      this.settingsEdgeToggle.setAttribute('aria-label', label);
      this.settingsEdgeToggle.title = label;
    }
    const collapseBtn = document.getElementById('rag-settings-collapse-btn');
    if (collapseBtn) {
      collapseBtn.setAttribute('aria-label', label);
      collapseBtn.title = label;
    }
    if (this.overlay) this.overlay.classList.toggle('visible', !collapsed && this.isOverlayMode());
    localStorage.setItem('rag-settings-collapsed', collapsed);
    this.updateTopnavState();
  }

  updateTopnavState() {
    const menuBtn = document.getElementById('rag-topnav-menu-btn');
    const settingsBtn = document.getElementById('rag-topnav-settings-btn');

    const sidebarOpen = isMobile()
      ? this.sidebar?.classList.contains('open')
      : !this.sidebar?.classList.contains('collapsed');
    const settingsOpen = !this.settingsPanel?.classList.contains('collapsed');

    menuBtn?.classList.toggle('topnav-pill--active', sidebarOpen);
    settingsBtn?.classList.toggle('topnav-pill--active', settingsOpen);
  }

  bindSettingsEvents() {
    const bind = (id, handler) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', handler);
      if (el?.type === 'range' || el?.type === 'number') el?.addEventListener('input', handler);
    };

    bind('rag-embedding-provider', () => {
      const provider = document.getElementById('rag-embedding-provider').value;
      ragState.updateSettings({ embeddingProvider: provider });
      this.populateEmbeddingModels(provider);
      this.syncEmbedKeyField();
    });
    bind('rag-embedding-model', () => {
      ragState.updateSettings({ embeddingModel: document.getElementById('rag-embedding-model').value });
    });
    bind('rag-chat-provider', () => {
      const provider = document.getElementById('rag-chat-provider').value;
      ragState.updateSettings({ chatProvider: provider });
      this.populateChatModels(provider);
      this.syncChatKeyField();
    });
    bind('rag-chat-model', () => {
      ragState.updateSettings({ chatModel: document.getElementById('rag-chat-model').value });
    });
    bind('rag-chunk-size', () => {
      ragState.updateSettings({ chunkSize: parseInt(document.getElementById('rag-chunk-size').value, 10) });
    });
    bind('rag-chunk-overlap', () => {
      ragState.updateSettings({ chunkOverlap: parseInt(document.getElementById('rag-chunk-overlap').value, 10) });
    });
    bind('rag-chunk-strategy', () => {
      ragState.updateSettings({ chunkStrategy: document.getElementById('rag-chunk-strategy').value });
    });
    bind('rag-top-k', () => {
      ragState.updateSettings({ topK: parseInt(document.getElementById('rag-top-k').value, 10) });
    });
    bind('rag-similarity-threshold', () => {
      const val = parseFloat(document.getElementById('rag-similarity-threshold').value);
      ragState.updateSettings({ similarityThreshold: val });
      document.getElementById('rag-threshold-value').textContent = val.toFixed(2);
    });
    bind('rag-search-strategy', () => {
      ragState.updateSettings({ searchStrategy: document.getElementById('rag-search-strategy').value });
    });
    bind('rag-system-prompt', () => {
      ragState.updateSettings({ systemPrompt: document.getElementById('rag-system-prompt').value });
    });
    bind('rag-rag-prompt', () => {
      ragState.updateSettings({ ragPrompt: document.getElementById('rag-rag-prompt').value });
    });
    bind('rag-temperature', () => {
      const val = parseFloat(document.getElementById('rag-temperature').value);
      ragState.updateSettings({ temperature: val });
      document.getElementById('rag-temp-value').textContent = val.toFixed(1);
    });
    bind('rag-max-tokens', () => {
      ragState.updateSettings({ maxTokens: parseInt(document.getElementById('rag-max-tokens').value, 10) });
    });
    bind('rag-max-context-chars', () => {
      ragState.updateSettings({ maxContextChars: parseInt(document.getElementById('rag-max-context-chars').value, 10) });
    });
    bind('rag-cors-proxy-url', () => {
      ragState.updateSettings({ corsProxyUrl: document.getElementById('rag-cors-proxy-url').value.trim() });
    });

    document.getElementById('rag-test-embed-key-btn')?.addEventListener('click', () => this.testApiKey('embedding'));
    document.getElementById('rag-test-chat-key-btn')?.addEventListener('click', () => this.testApiKey('chat'));
    document.getElementById('rag-refresh-chat-models-btn')?.addEventListener('click', () => this.fetchChatModels());

    const embedKeyInput = document.getElementById('rag-embedding-key-input');
    const embedKeyToggle = document.getElementById('rag-embedding-key-toggle');
    embedKeyInput?.addEventListener('input', () => {
      ragState.setApiKey(ragState.settings.embeddingProvider, embedKeyInput.value.trim());
    });
    embedKeyToggle?.addEventListener('click', () => this.toggleKeyVisibility(embedKeyInput, embedKeyToggle));

    const chatKeyInput = document.getElementById('rag-chat-key-input');
    const chatKeyToggle = document.getElementById('rag-chat-key-toggle');
    chatKeyInput?.addEventListener('input', () => {
      ragState.setApiKey(ragState.settings.chatProvider, chatKeyInput.value.trim());
    });
    chatKeyToggle?.addEventListener('click', () => this.toggleKeyVisibility(chatKeyInput, chatKeyToggle));
  }

  toggleKeyVisibility(input, btn) {
    if (!input || !btn) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.classList.toggle('key-visible', isPass);
    const label = isPass ? 'Hide API key' : 'Show API key';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }

  renderCollections() {
    const list = document.getElementById('rag-collections-list');
    if (!list) return;

    const activeId = ragState.getActiveCollection()?.id;
    list.innerHTML = ragState.collections.map(c => `
      <div class="rag-collection-row${c.id === activeId ? ' active' : ''}" data-id="${c.id}">
        <button type="button" class="rag-collection-item" data-id="${c.id}" data-tip="${c.id === activeId ? 'Active knowledge base' : 'Switch to this knowledge base'}">
          <span class="rag-collection-name">${this.escape(c.name)}</span>
          <span class="rag-collection-meta">${c.documents.length} docs</span>
        </button>
        <div class="rag-collection-actions">
          <button type="button" class="btn-icon rag-collection-rename" data-id="${c.id}" aria-label="Rename collection" data-tip="Rename this knowledge base">✎</button>
          <button type="button" class="btn-icon rag-collection-delete" data-id="${c.id}" aria-label="Delete collection" data-tip="Delete collection and all its documents">×</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.rag-collection-item').forEach(btn => {
      btn.addEventListener('click', () => ragState.setActiveCollection(btn.dataset.id));
    });
    list.querySelectorAll('.rag-collection-rename').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const col = ragState.collections.find(c => c.id === btn.dataset.id);
        const name = await showPrompt({ title: 'Rename collection', defaultValue: col?.name || '' });
        if (name?.trim()) ragState.renameCollection(btn.dataset.id, name.trim());
      });
    });
    list.querySelectorAll('.rag-collection-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (ragState.collections.length <= 1) {
          showToast('Keep at least one collection', { isError: true });
          return;
        }
        const ok = await showConfirm({ title: 'Delete collection?', message: 'Documents and eval data for this collection will be removed.', destructive: true });
        if (ok) ragState.deleteCollection(btn.dataset.id);
      });
    });
  }

  renderDocuments() {
    const list = document.getElementById('rag-documents-list');
    const collection = ragState.getActiveCollection();
    if (!list) return;

    if (!collection || collection.documents.length === 0) {
      list.innerHTML = '<p class="rag-empty-hint">No documents yet. Upload PDF, DOCX, TXT, or Markdown files.</p>';
      return;
    }

    list.innerHTML = collection.documents.map(doc => `
      <div class="rag-document-item" data-id="${doc.id}">
        <div class="rag-document-info">
          <span class="rag-document-name">${this.escape(doc.name)}</span>
          <span class="rag-document-meta">${doc.chunks.length} chunks · ${this.formatSize(doc.size)}</span>
        </div>
        <span class="rag-doc-status rag-doc-status--${doc.status}">${doc.status}</span>
        <button type="button" class="rag-doc-delete" data-id="${doc.id}" aria-label="Delete document" data-tip="Remove document and all its chunks">${iconHtml('x', { size: 14, className: 'icon' })}</button>
      </div>
    `).join('');

    list.querySelectorAll('.rag-doc-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await showConfirm({ title: 'Delete document?', message: 'This document and its chunks will be removed.', destructive: true });
        if (ok) ragState.deleteDocument(collection.id, btn.dataset.id);
      });
    });
  }

  renderSettings() {
    const s = ragState.settings;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    this.populateProviderSelects();
    setVal('rag-embedding-provider', s.embeddingProvider);
    setVal('rag-chat-provider', s.chatProvider);
    this.populateEmbeddingModels(s.embeddingProvider);
    this.populateChatModels(s.chatProvider);
    setVal('rag-embedding-model', s.embeddingModel);
    setVal('rag-chat-model', s.chatModel);
    setVal('rag-chunk-size', s.chunkSize);
    setVal('rag-chunk-overlap', s.chunkOverlap);
    setVal('rag-chunk-strategy', s.chunkStrategy);
    setVal('rag-top-k', s.topK);
    setVal('rag-similarity-threshold', s.similarityThreshold);
    setVal('rag-search-strategy', s.searchStrategy);
    setVal('rag-system-prompt', s.systemPrompt);
    setVal('rag-rag-prompt', s.ragPrompt);
    setVal('rag-temperature', s.temperature);
    setVal('rag-max-tokens', s.maxTokens);
    setVal('rag-max-context-chars', s.maxContextChars ?? 8000);
    setVal('rag-cors-proxy-url', s.corsProxyUrl || '');

    const thresholdVal = document.getElementById('rag-threshold-value');
    if (thresholdVal) thresholdVal.textContent = s.similarityThreshold.toFixed(2);
    const tempVal = document.getElementById('rag-temp-value');
    if (tempVal) tempVal.textContent = s.temperature.toFixed(1);

    this.syncKeyFields();
    this.renderRetrievalScope();
  }

  renderRetrievalScope() {
    const root = document.getElementById('rag-retrieval-scope');
    const collection = ragState.getActiveCollection();
    if (!root) return;
    if (!collection?.documents.length) {
      root.innerHTML = '<p class="settings-hint">Upload documents to limit retrieval scope.</p>';
      return;
    }
    const selected = new Set(ragState.settings.retrievalDocIds || []);
    root.innerHTML = collection.documents.map(doc => `
      <label class="rag-scope-check">
        <input type="checkbox" value="${doc.id}" ${!selected.size || selected.has(doc.id) ? 'checked' : ''} ${doc.status !== 'indexed' ? 'disabled' : ''} />
        <span>${this.escape(doc.name)}${doc.status !== 'indexed' ? ' (not indexed)' : ''}</span>
      </label>
    `).join('');
    root.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => {
        const checked = Array.from(root.querySelectorAll('input:checked:not(:disabled)')).map(i => i.value);
        const allIndexed = collection.documents.filter(d => d.status === 'indexed').map(d => d.id);
        const scope = checked.length === allIndexed.length ? [] : checked;
        ragState.updateSettings({ retrievalDocIds: scope });
      });
    });
    document.getElementById('rag-retrieval-scope-all')?.addEventListener('click', () => {
      ragState.updateSettings({ retrievalDocIds: [] });
      this.renderRetrievalScope();
    }, { once: true });
  }

  getKeyPlaceholder(provider) {
    const placeholders = {
      openai: 'sk-…',
      anthropic: 'sk-ant-…',
      gemini: 'AI…',
      openrouter: 'sk-or-…',
      groq: 'gsk_…',
      deepseek: 'sk-…',
      mistral: '…',
      cohere: '…',
      voyage: 'pa-…',
    };
    return placeholders[provider] || 'Paste API key…';
  }

  syncEmbedKeyField() {
    const provider = ragState.settings.embeddingProvider;
    const config = RAG_PROVIDERS[provider];
    const input = document.getElementById('rag-embedding-key-input');
    const docsLink = document.getElementById('rag-embed-docs-link');

    if (input && !input.matches(':focus')) {
      input.value = ragState.getApiKey(provider);
      input.placeholder = this.getKeyPlaceholder(provider);
    }
    if (docsLink) {
      if (config?.docsUrl) {
        docsLink.href = config.docsUrl;
        docsLink.hidden = false;
      } else {
        docsLink.hidden = true;
      }
    }
  }

  syncChatKeyField() {
    const provider = ragState.settings.chatProvider;
    const config = RAG_PROVIDERS[provider];
    const input = document.getElementById('rag-chat-key-input');
    const docsLink = document.getElementById('rag-chat-docs-link');

    if (input && !input.matches(':focus')) {
      input.value = ragState.getApiKey(provider);
      input.placeholder = this.getKeyPlaceholder(provider);
    }
    if (docsLink) {
      if (config?.docsUrl) {
        docsLink.href = config.docsUrl;
        docsLink.hidden = false;
      } else {
        docsLink.hidden = true;
      }
    }
  }

  syncKeyFields() {
    this.syncEmbedKeyField();
    this.syncChatKeyField();
  }

  populateProviderSelects() {
    const embedSelect = document.getElementById('rag-embedding-provider');
    const chatSelect = document.getElementById('rag-chat-provider');
    if (embedSelect) {
      embedSelect.innerHTML = EMBEDDING_PROVIDERS.map(p =>
        `<option value="${p.id}">${p.name}</option>`
      ).join('');
    }
    if (chatSelect) {
      chatSelect.innerHTML = CHAT_PROVIDERS.map(p =>
        `<option value="${p.id}">${p.name}</option>`
      ).join('');
    }
  }

  populateEmbeddingModels(provider) {
    const select = document.getElementById('rag-embedding-model');
    if (!select) return;
    const models = RAG_PROVIDERS[provider]?.embeddingModels || [];
    select.innerHTML = models.map(m =>
      `<option value="${m.id}">${m.name}</option>`
    ).join('');
    if (models.length && !models.find(m => m.id === ragState.settings.embeddingModel)) {
      ragState.updateSettings({ embeddingModel: models[0].id });
    }
  }

  populateChatModels(provider) {
    const select = document.getElementById('rag-chat-model');
    if (!select) return;
    const models = RAG_PROVIDERS[provider]?.defaultChatModels || [];
    select.innerHTML = models.map(m =>
      `<option value="${m.id}">${m.name}</option>`
    ).join('');
  }

  async fetchChatModels() {
    const s = ragState.settings;
    const key = ragState.getApiKey(s.chatProvider);
    if (!key) {
      showToast('Add chat API key first', { isError: true });
      return;
    }
    const btn = document.getElementById('rag-refresh-chat-models-btn');
    if (btn) btn.disabled = true;
    try {
      const models = await listChatModels(s.chatProvider, key, s.corsProxyUrl);
      const select = document.getElementById('rag-chat-model');
      if (select && models.length) {
        select.innerHTML = models.map(m =>
          `<option value="${m.id}">${m.name || m.id}</option>`
        ).join('');
        showToast(`Loaded ${models.length} models`);
      }
    } catch (e) {
      showToast(e.message, { isError: true });
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  renderMessages() {
    const container = document.getElementById('rag-messages');
    const welcome = document.getElementById('rag-welcome');
    if (!container) return;

    const messages = ragState.messages;
    if (messages.length === 0) {
      if (welcome) welcome.hidden = false;
      container.querySelectorAll('.rag-message').forEach(el => el.remove());
      return;
    }

    if (welcome) welcome.hidden = true;
    container.querySelectorAll('.rag-message').forEach(el => el.remove());

    messages.forEach(msg => {
      const el = document.createElement('div');
      el.className = `rag-message rag-message--${msg.role}`;
      el.innerHTML = this.renderMessageHtml(msg);
      container.appendChild(el);
    });

    container.scrollTop = container.scrollHeight;
  }

  renderMessageHtml(msg) {
    if (msg.role === 'user') {
      return `<div class="rag-message-content">${this.escape(msg.content)}</div>`;
    }

    let html = `<div class="rag-message-content">${msg.isStreaming ? msg.content || '…' : renderMarkdown(msg.content || '')}</div>`;

    if (msg.retrieved?.length) {
      html += `<div class="rag-retrieval-panel">
        <div class="rag-retrieval-header">Retrieved chunks (${msg.retrieved.length})</div>
        ${msg.retrieved.map((r, i) => `
          <div class="rag-chunk-card">
            <div class="rag-chunk-header">
              <span class="rag-chunk-source">${this.escape(r.chunk.docName || 'doc')} #${r.chunk.index + 1}</span>
              <span class="rag-chunk-score">${r.score.toFixed(3)}</span>
            </div>
            <div class="rag-chunk-text">${this.escape(r.chunk.text.slice(0, 300))}${r.chunk.text.length > 300 ? '…' : ''}</div>
          </div>
        `).join('')}
      </div>`;
    }

    if (msg.context) {
      html += `<details class="rag-context-inspector">
        <summary>Context sent to LLM</summary>
        <pre class="rag-context-pre">${this.escape(msg.context)}</pre>
      </details>`;
    }

    if (msg.meta) {
      html += `<div class="rag-message-meta">
        ${msg.meta.latency ? `<span>${msg.meta.latency}s</span>` : ''}
        ${msg.meta.tokens ? `<span>${msg.meta.tokens.total_tokens || 0} tokens</span>` : ''}
        ${msg.meta.cost ? `<span>$${msg.meta.cost.toFixed(4)}</span>` : ''}
      </div>`;
    }

    return html;
  }

  bindUsageButtons() {
    ['rag-topnav-usage-btn', 'rag-sidebar-usage-btn', 'rag-settings-usage-btn'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => openUsageWindow());
    });
  }

  renderSettingsUsageSummary() {
    const el = document.getElementById('rag-settings-usage-summary');
    if (!el) return;
    const usage = ragState.usage;
    const avgLatency = usage.latency.length
      ? (usage.latency.reduce((a, b) => a + b, 0) / usage.latency.length).toFixed(2)
      : '—';
    el.className = 'rag-settings-usage-summary rag-usage-stats--clickable';
    setTip(el, 'Click to open usage dashboard — requests, tokens, cost, and latency');
    el.onclick = () => openUsageWindow();
    el.innerHTML = `
      <span class="settings-status-item">${usage.requests} requests</span>
      <span class="settings-status-sep" aria-hidden="true">·</span>
      <span class="settings-status-item">${usage.tokens.toLocaleString()} tokens</span>
      <span class="settings-status-sep" aria-hidden="true">·</span>
      <span class="settings-status-item">$${usage.cost.toFixed(4)} (est.)</span>
      <span class="settings-status-sep" aria-hidden="true">·</span>
      <span class="settings-status-item">${avgLatency}s avg</span>
    `;
  }

  renderUsage() {
    const usage = ragState.usage;
    const el = document.getElementById('rag-usage-stats');
    if (!el) return;
    const avgLatency = usage.latency.length
      ? (usage.latency.reduce((a, b) => a + b, 0) / usage.latency.length).toFixed(2)
      : '—';
    el.className = 'rag-usage-stats rag-usage-stats--clickable';
    setTip(el, 'Session stats — click to open full usage dashboard');
    el.innerHTML = `
      <span>${usage.requests} requests</span>
      <span>${usage.tokens.toLocaleString()} tokens</span>
      <span>$${usage.cost.toFixed(4)}</span>
      <span>${avgLatency}s avg</span>
    `;
    el.onclick = () => openUsageWindow();
  }

  async handleNewCollection() {
    const name = await showPrompt({ title: 'New collection', defaultValue: 'New Knowledge Base' });
    if (name) ragState.createCollection(name);
  }

  handleImportCollection() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        ragState.importCollection(text);
        showToast('Collection imported');
      } catch (e) {
        showToast('Import failed: ' + e.message, { isError: true });
      }
    });
    input.click();
  }

  handleExportCollection() {
    const collection = ragState.getActiveCollection();
    if (!collection) return;
    const json = ragState.exportCollection(collection.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Collection exported');
  }

  async handleFileUpload(e) {
    const files = e.target.files;
    if (!files?.length) return;
    await this.processFiles(Array.from(files));
    e.target.value = '';
  }

  async handleFileDrop(e) {
    const files = Array.from(e.dataTransfer.files);
    await this.processFiles(files);
  }

  async processFiles(files) {
    const collection = ragState.getActiveCollection();
    if (!collection) return;

    for (const file of files) {
      if (!isSupportedFile(file)) {
        showToast(`Unsupported file: ${file.name}`, { isError: true });
        continue;
      }
      try {
        const content = await parseDocument(file);
        const type = file.name.split('.').pop().toLowerCase();
        const doc = ragState.addDocument(collection.id, file.name, content, type);
        if (doc) await this.indexDocument(collection.id, doc.id);
      } catch (e) {
        showToast(`Failed to process ${file.name}: ${e.message}`, { isError: true });
      }
    }
  }

  async indexDocument(collectionId, docId) {
    const collection = ragState.collections.find(c => c.id === collectionId);
    const doc = collection?.documents.find(d => d.id === docId);
    if (!doc) return;

    const s = ragState.settings;
    const key = ragState.getApiKey(s.embeddingProvider);
    if (!key) {
      ragState.setDocumentStatus(collectionId, docId, 'error');
      showToast('Add embedding API key to index documents', { isError: true });
      return;
    }

    ragState.setDocumentStatus(collectionId, docId, 'indexing');

    try {
      const rawChunks = chunkText(doc.content, {
        chunkSize: s.chunkSize,
        chunkOverlap: s.chunkOverlap,
        strategy: s.chunkStrategy,
      });

      const { embeddings, tokens } = await createEmbeddings(
        s.embeddingProvider, key, s.embeddingModel, rawChunks.map(c => c.text), s.corsProxyUrl
      );

      const chunks = rawChunks.map((chunk, i) => ({
        ...chunk,
        embedding: embeddings[i] || [],
      }));

      ragState.updateDocumentChunks(collectionId, docId, chunks);

      const cost = estimateEmbeddingCost(s.embeddingModel, tokens);
      ragState.recordUsage(tokens, cost || 0, 0);
    } catch (e) {
      ragState.setDocumentStatus(collectionId, docId, 'error');
      showToast(`Indexing failed: ${e.message}`, { isError: true });
    }
  }

  async reindexCollection() {
    const collection = ragState.getActiveCollection();
    if (!collection) return;
    if (this.indexing) return;
    this.indexing = true;
    const btn = document.getElementById('rag-reindex-btn');
    if (btn) btn.disabled = true;

    try {
      for (const doc of collection.documents) {
        await this.indexDocument(collection.id, doc.id);
      }
      showToast('Reindexing complete');
    } finally {
      this.indexing = false;
      if (btn) btn.disabled = false;
    }
  }

  async testApiKey(type) {
    const s = ragState.settings;
    const provider = type === 'embedding' ? s.embeddingProvider : s.chatProvider;
    const key = ragState.getApiKey(provider);
    const statusEl = document.getElementById(type === 'embedding' ? 'rag-embed-key-status' : 'rag-chat-key-status');
    if (!key) {
      if (statusEl) statusEl.textContent = 'No key entered';
      return;
    }
    if (statusEl) statusEl.textContent = 'Testing…';
    const result = await validateApiKey(provider, key, s.corsProxyUrl);
    if (statusEl) {
      statusEl.textContent = result.message;
      statusEl.className = `rag-key-test-status ${result.valid ? 'valid' : 'invalid'}`;
    }
  }

  async handleSend() {
    if (this.abortController) return;

    const input = document.getElementById('rag-message-input');
    const question = input?.value?.trim();
    if (!question) return;

    if (!ragState.isConfigured()) {
      showToast('Configure API keys and models in settings', { isError: true });
      return;
    }

    const collection = ragState.getActiveCollection();
    if (!collection?.documents.some(d => d.chunks.length)) {
      showToast('Upload and index documents first', { isError: true });
      return;
    }

    input.value = '';
    const s = ragState.settings;
    const embedKey = ragState.getApiKey(s.embeddingProvider);
    const chatKey = ragState.getApiKey(s.chatProvider);

    ragState.addMessage({ role: 'user', content: question });
    this.setLoading(true);

    const startTime = Date.now();
    let embedTokens = 0;
    let embedCost = 0;

    try {
      const { embeddings, tokens } = await createEmbeddings(
        s.embeddingProvider, embedKey, s.embeddingModel, [question], s.corsProxyUrl
      );
      embedTokens = tokens;
      embedCost = estimateEmbeddingCost(s.embeddingModel, tokens) || 0;

      const queryEmbedding = embeddings[0];
      const allChunks = ragState.getAllChunks(collection.id);
      const retrieved = searchChunks(queryEmbedding, allChunks, {
        topK: s.topK,
        similarityThreshold: s.similarityThreshold,
        searchStrategy: s.searchStrategy,
        docIds: s.retrievalDocIds?.length ? s.retrievalDocIds : undefined,
      });

      const context = buildContext(retrieved, s.maxContextChars ?? 8000);
      const ragContent = formatRagPrompt(s.ragPrompt, context, question);

      ragState.addMessage({
        role: 'assistant',
        content: '',
        retrieved,
        context: ragContent,
        isStreaming: true,
      });

      await this.streamChatResponse(ragContent, s, chatKey, startTime, embedTokens, embedCost);
    } catch (e) {
      if (e.name !== 'AbortError') {
        ragState.updateLastMessage({ content: e.message, isError: true, isStreaming: false });
        showToast(e.message, { isError: true });
      }
    } finally {
      this.setLoading(false);
      this.abortController = null;
    }
  }

  async streamChatResponse(ragContent, settings, chatKey, startTime, embedTokens, embedCost) {
    this.abortController = new AbortController();
    const providerId = settings.chatProvider;

    if (providerId === 'gemini') {
      await this.streamGemini(ragContent, settings, chatKey, startTime, embedTokens, embedCost);
      return;
    }

    if (providerId === 'anthropic') {
      await this.streamAnthropic(ragContent, settings, chatKey, startTime, embedTokens, embedCost);
      return;
    }

  if (providerId === 'cohere') {
      await this.streamCohere(ragContent, settings, chatKey, startTime, embedTokens, embedCost);
      return;
    }

    if (providerId === 'mistral') {
      await this.streamOpenAICompatible(ragContent, settings, chatKey, 'https://api.mistral.ai/v1', startTime, embedTokens, embedCost);
      return;
    }

    const provider = createProvider(providerId, chatKey, settings.corsProxyUrl);
    const messages = [
      { role: 'user', content: ragContent },
    ];

    const streamSettings = {
      ...settings,
      provider: providerId,
      systemPrompt: settings.systemPrompt,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
    };

    let fullText = '';
    const stream = provider.streamChat(messages, streamSettings, this.abortController.signal);

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        fullText += chunk.content;
        ragState.updateLastMessage({ content: fullText, isStreaming: true });
        this.renderMessages();
      } else if (chunk.type === 'usage') {
        const latency = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
        const cost = estimateCost(settings.chatModel, chunk.usage.prompt_tokens, chunk.usage.completion_tokens);
        const totalCost = (cost || 0) + embedCost;
        const totalTokens = embedTokens + chunk.usage.total_tokens;
        ragState.updateLastMessage({
          content: fullText,
          isStreaming: false,
          meta: { latency, tokens: chunk.usage, cost: totalCost },
        });
        ragState.recordUsage(totalTokens, totalCost, latency);
        this.renderUsage();
      }
    }

    const latency = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
    ragState.updateLastMessage({ content: fullText || '(No response)', isStreaming: false });
    if (!ragState.messages[ragState.messages.length - 1]?.meta) {
      ragState.recordUsage(embedTokens, embedCost, latency);
    }
    this.renderMessages();
  }

  async streamGemini(ragContent, settings, chatKey, startTime, embedTokens, embedCost) {
    const model = settings.chatModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${chatKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: settings.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: ragContent }] }],
        generationConfig: { temperature: settings.temperature, maxOutputTokens: settings.maxTokens },
      }),
      signal: this.abortController.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    let fullText = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            fullText += text;
            ragState.updateLastMessage({ content: fullText, isStreaming: true });
            this.renderMessages();
          }
        } catch { /* skip */ }
      }
    }

    const latency = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
    ragState.updateLastMessage({
      content: fullText || '(No response)',
      isStreaming: false,
      meta: { latency, cost: embedCost },
    });
    ragState.recordUsage(embedTokens, embedCost, latency);
    this.renderUsage();
    this.renderMessages();
  }

  async streamAnthropic(ragContent, settings, chatKey, startTime, embedTokens, embedCost) {
    const corsProxy = settings.corsProxyUrl;
    const base = corsProxy
      ? corsProxy.replace(/\/+$/, '') + '/api.anthropic.com/v1'
      : 'https://api.anthropic.com/v1';

    const res = await fetch(`${base}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': chatKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.chatModel,
        max_tokens: settings.maxTokens,
        system: settings.systemPrompt,
        messages: [{ role: 'user', content: ragContent }],
        stream: true,
      }),
      signal: this.abortController.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    let fullText = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content_block_delta' && data.delta?.text) {
            fullText += data.delta.text;
            ragState.updateLastMessage({ content: fullText, isStreaming: true });
            this.renderMessages();
          }
        } catch { /* skip */ }
      }
    }

    const latency = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
    ragState.updateLastMessage({
      content: fullText || '(No response)',
      isStreaming: false,
      meta: { latency, cost: embedCost },
    });
    ragState.recordUsage(embedTokens, embedCost, latency);
    this.renderUsage();
    this.renderMessages();
  }

  async streamCohere(ragContent, settings, chatKey, startTime, embedTokens, embedCost) {
    const res = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chatKey}`,
      },
      body: JSON.stringify({
        model: settings.chatModel,
        messages: [
          { role: 'system', content: settings.systemPrompt },
          { role: 'user', content: ragContent },
        ],
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        stream: true,
      }),
      signal: this.abortController.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    let fullText = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          const text = data.delta?.message?.content?.text || data.message?.content?.text || '';
          if (text) {
            fullText += text;
            ragState.updateLastMessage({ content: fullText, isStreaming: true });
            this.renderMessages();
          }
        } catch { /* skip */ }
      }
    }

    const latency = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
    ragState.updateLastMessage({
      content: fullText || '(No response)',
      isStreaming: false,
      meta: { latency, cost: embedCost },
    });
    ragState.recordUsage(embedTokens, embedCost, latency);
    this.renderUsage();
    this.renderMessages();
  }

  async streamOpenAICompatible(ragContent, settings, chatKey, baseUrl, startTime, embedTokens, embedCost) {
    const corsProxy = settings.corsProxyUrl;
    const url = corsProxy
      ? corsProxy.replace(/\/+$/, '') + '/' + baseUrl.replace(/^https?:\/\//, '') + '/chat/completions'
      : `${baseUrl}/chat/completions`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chatKey}`,
      },
      body: JSON.stringify({
        model: settings.chatModel,
        messages: [
          { role: 'system', content: settings.systemPrompt },
          { role: 'user', content: ragContent },
        ],
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal: this.abortController.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    let fullText = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          const text = data.choices?.[0]?.delta?.content || '';
          if (text) {
            fullText += text;
            ragState.updateLastMessage({ content: fullText, isStreaming: true });
            this.renderMessages();
          }
          if (data.usage) {
            const latency = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
            const cost = estimateCost(settings.chatModel, data.usage.prompt_tokens, data.usage.completion_tokens);
            const totalCost = (cost || 0) + embedCost;
            ragState.updateLastMessage({
              content: fullText,
              isStreaming: false,
              meta: { latency, tokens: data.usage, cost: totalCost },
            });
            ragState.recordUsage(embedTokens + data.usage.total_tokens, totalCost, latency);
            this.renderUsage();
          }
        } catch { /* skip */ }
      }
    }

    const latency = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
    ragState.updateLastMessage({ content: fullText || '(No response)', isStreaming: false });
    if (!ragState.messages[ragState.messages.length - 1]?.meta) {
      ragState.recordUsage(embedTokens, embedCost, latency);
    }
    this.renderMessages();
  }

  handleStop() {
    if (this.abortController) this.abortController.abort();
  }

  setLoading(loading) {
    const sendBtn = document.getElementById('rag-send-btn');
    const stopBtn = document.getElementById('rag-stop-btn');
    const input = document.getElementById('rag-message-input');
    if (sendBtn) sendBtn.style.display = loading ? 'none' : '';
    if (stopBtn) stopBtn.style.display = loading ? '' : 'none';
    if (input) input.disabled = loading;
  }

  escape(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
