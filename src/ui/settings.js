import { state } from '../state.js';
import { PROVIDERS, createProvider } from '../providers/registry.js';
import { RESPONSE_PROFILES } from '../data/presets.js';
import { getModelHint } from '../data/model-hints.js';
import { showConfirm } from './modal.js';
import { showToast } from './toast.js';
import { isMobile, isTablet, onViewportChange, closeMobileSidebar } from './breakpoints.js';
import { iconHtml } from './icons.js';

const MAX_COMPARE_MODELS = 3;

export class SettingsUI {
  constructor() {
    this.panel = document.getElementById('settings-panel');
    this.overlay = document.getElementById('overlay');
    this.edgeToggle = document.getElementById('settings-edge-toggle');
    this.collapseBtn = document.getElementById('settings-collapse-btn');
    this.mobileToggle = document.getElementById('settings-toggle-mobile');
    this.settingsCloseBtn = document.getElementById('settings-close-btn');

    this.settingsStatus = document.getElementById('settings-status');
    this.providerSelect = document.getElementById('provider-select');
    this.providerDescription = document.getElementById('provider-description');
    this.providerDocsLink = document.getElementById('provider-docs-link');
    this.apiKeyInput = document.getElementById('api-key-input');
    this.toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
    this.testKeyBtn = document.getElementById('test-key-btn');
    this.keyStatus = document.getElementById('key-status');
    this.corsProxyRow = document.getElementById('cors-proxy-row');
    this.corsProxyInput = document.getElementById('cors-proxy-input');
    this.switchOpenRouterBtn = document.getElementById('switch-openrouter-btn');
    this.modelSelect = document.getElementById('model-select');
    this.modelSearch = document.getElementById('model-search');
    this.modelHint = document.getElementById('model-hint');
    this.favoriteModelBtn = document.getElementById('favorite-model-btn');
    this.modelQuickPicks = document.getElementById('model-quick-picks');
    this.refreshModelsBtn = document.getElementById('refresh-models-btn');
    this.compareModeToggle = document.getElementById('compare-mode-toggle');
    this.compareModelsRow = document.getElementById('compare-models-row');
    this.compareModelChecks = document.getElementById('compare-model-checks');
    this.compareModelsHint = document.getElementById('compare-models-hint');
    this.profileSelect = document.getElementById('profile-select');
    this.systemPrompt = document.getElementById('system-prompt');
    this.assistantNameInput = document.getElementById('assistant-name-input');
    this.lastModelList = [];
    this.modelSearchQuery = '';

    this.availableModels = [];
    this.init();
  }

  init() {
    if (this.mobileToggle) this.mobileToggle.addEventListener('click', () => this.togglePanel());
    if (this.settingsCloseBtn) this.settingsCloseBtn.addEventListener('click', () => this.collapsePanel());
    if (this.edgeToggle) this.edgeToggle.addEventListener('click', () => this.togglePanel());
    if (this.collapseBtn) {
      this.collapseBtn.addEventListener('click', () => {
        if (!this.isOverlayMode()) this.collapsePanel();
      });
    }
    this.overlay.addEventListener('click', () => this.collapsePanel());

    this.providerSelect.addEventListener('change', () => this.handleProviderChange());
    this.apiKeyInput.addEventListener('input', () => this.handleKeyInput());
    this.toggleKeyVisibilityBtn.addEventListener('click', () => this.toggleKeyVisibility());
    this.testKeyBtn.addEventListener('click', () => this.testConnection());
    this.corsProxyInput.addEventListener('input', () => {
      state.updateSettings({ corsProxyUrl: this.corsProxyInput.value.trim() });
    });
    this.refreshModelsBtn.addEventListener('click', () => this.fetchModels(true));
    this.modelSelect.addEventListener('change', () => {
      state.updateSettings({ model: this.modelSelect.value });
      state.pushRecentModel(this.modelSelect.value);
      this.modelHint.textContent = getModelHint(this.modelSelect.value);
      this.updateFavoriteButton();
      this.renderModelQuickPicks();
      this.updateSettingsStatus();
    });

    this.modelSearch?.addEventListener('input', () => {
      this.modelSearchQuery = this.modelSearch.value.trim().toLowerCase();
      this.renderModelOptions(this.lastModelList);
    });

    this.favoriteModelBtn?.addEventListener('click', () => {
      const modelId = this.modelSelect.value;
      if (!modelId) return;
      const added = state.toggleFavoriteModel(modelId);
      if (!added && !(state.settings.favoriteModels || []).includes(modelId)) {
        showToast('You can save up to 5 favorite models', { isError: true });
      }
      this.updateFavoriteButton();
      this.renderModelOptions(this.lastModelList);
      this.renderModelQuickPicks();
    });

    this.compareModeToggle?.addEventListener('change', () => {
      const enabled = this.compareModeToggle.checked;
      this.compareModelsRow.hidden = !enabled;
      state.updateSettings({ compareMode: enabled });
    });

    this.switchOpenRouterBtn?.addEventListener('click', () => {
      this.providerSelect.value = 'openrouter';
      this.handleProviderChange();
    });

    this.profileSelect?.addEventListener('change', () => this.applyProfile(this.profileSelect.value));

    this.systemPrompt.addEventListener('input', () => {
      state.updateSettings({ systemPrompt: this.systemPrompt.value });
    });

    this.assistantNameInput?.addEventListener('input', () => {
      state.updateSettings({ assistantName: this.assistantNameInput.value });
    });

    this.bindDataButtons();

    state.on('settings-changed', () => this.updateSettingsStatus());
    state.on('usage-updated', () => this.updateSettingsStatus());
    state.on('apikey-changed', () => this.updateSettingsStatus());

    this.loadStateValues();

    const stored = localStorage.getItem('settings-collapsed');
    const collapsed = stored !== null ? stored === 'true' : this.isOverlayMode();
    this.setCollapsed(collapsed);

    onViewportChange(({ mobile, tablet }) => {
      if (!mobile) closeMobileSidebar();
      if (!tablet && this.overlay) this.overlay.classList.remove('visible');
    });
  }

  applyProfile(key) {
    const profile = RESPONSE_PROFILES[key];
    if (!profile) return;
    state.updateSettings({
      responseProfile: key,
      temperature: profile.temperature,
      topP: profile.topP,
      frequencyPenalty: profile.frequencyPenalty,
      presencePenalty: profile.presencePenalty,
      reasoningMode: profile.reasoningMode || false,
      reasoningEffort: profile.reasoningEffort || 'medium',
      systemPrompt: profile.systemPrompt,
    });
    this.systemPrompt.value = profile.systemPrompt;
  }

  bindDataButtons() {
    document.getElementById('export-all-btn')?.addEventListener('click', () => {
      const data = state.exportAllChats();
      this.downloadFile('ai-playground-chats.json', data);
    });

    const importFile = document.getElementById('import-chats-file');
    document.getElementById('import-chats-btn')?.addEventListener('click', () => importFile?.click());
    importFile?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      if (state.importChats(text)) {
        this.showStatus('Chats imported', 'success');
      } else {
        this.showStatus('Import failed', 'error');
      }
      importFile.value = '';
    });

    document.getElementById('clear-all-data-btn')?.addEventListener('click', async () => {
      const ok = await showConfirm({
        title: 'Clear all data',
        message: 'Delete all chats, API keys, and usage history? This cannot be undone.',
        confirmText: 'Clear everything',
        destructive: true,
      });
      if (ok) {
        state.clearAllData();
        this.loadStateValues();
      }
    });
  }

  downloadFile(name, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  isMobile() {
    return isMobile();
  }

  isOverlayMode() {
    return isTablet();
  }

  expandPanel() {
    if (this.isOverlayMode()) closeMobileSidebar();
    this.setCollapsed(false);
  }

  openPanel() { this.expandPanel(); }
  closePanel() { this.collapsePanel(); }
  collapsePanel() { this.setCollapsed(true); }
  togglePanel() { this.setCollapsed(!this.panel.classList.contains('collapsed')); }

  setCollapsed(collapsed) {
    this.panel.classList.toggle('collapsed', collapsed);
    document.body.classList.toggle('settings-collapsed', collapsed);
    const label = collapsed ? 'Expand settings' : 'Collapse settings';
    if (this.edgeToggle) {
      this.edgeToggle.setAttribute('aria-expanded', String(!collapsed));
      this.edgeToggle.setAttribute('aria-label', label);
      this.edgeToggle.title = label;
    }
    if (this.collapseBtn) {
      this.collapseBtn.setAttribute('aria-label', label);
      this.collapseBtn.title = label;
    }
    if (this.overlay) this.overlay.classList.toggle('visible', !collapsed && this.isOverlayMode());
    localStorage.setItem('settings-collapsed', collapsed);
  }

  loadStateValues() {
    const settings = state.settings;
    this.providerSelect.value = settings.provider || '';
    this.corsProxyInput.value = settings.corsProxyUrl || '';
    this.apiKeyInput.value = settings.provider ? state.getApiKey(settings.provider) : '';
    this.testKeyBtn.disabled = !this.apiKeyInput.value;
    this.systemPrompt.value = settings.systemPrompt || '';
    if (this.profileSelect) {
      this.profileSelect.value = settings.responseProfile || 'balanced';
    }
    if (this.assistantNameInput) {
      this.assistantNameInput.value = settings.assistantName ?? 'Maya';
    }
    this.compareModeToggle.checked = !!settings.compareMode;
    this.compareModelsRow.hidden = !settings.compareMode;

    this.updateProviderUI();
    this.fetchModels(false);
    this.updateSettingsStatus();
  }

  updateSettingsStatus() {
    if (!this.settingsStatus) return;
    const issues = state.getSetupIssues();
    if (issues.length) {
      this.settingsStatus.innerHTML = `
        <span class="settings-status-item settings-status-item--warn">${issues.join(' · ')}</span>
      `;
      return;
    }

    const settings = state.settings;
    const provider = PROVIDERS[settings.provider]?.name || settings.provider;
    const modelShort = settings.model.split('/').pop();
    const hasKey = settings.provider === 'openrouter' || !!state.getApiKey(settings.provider);
    const keyLabel = hasKey ? 'Key saved' : 'No key';
    const usage = state.getUsageStats();
    const today = new Date().toISOString().slice(0, 10);
    const day = usage.daily[today] || { cost: 0 };
    const costLabel = day.cost > 0 ? `$${day.cost.toFixed(2)} today` : '$0 today';

    this.settingsStatus.innerHTML = `
      <span class="settings-status-item">${provider}</span>
      <span class="settings-status-sep" aria-hidden="true">·</span>
      <span class="settings-status-item">${modelShort}</span>
      <span class="settings-status-sep" aria-hidden="true">·</span>
      <span class="settings-status-item settings-status-item--${hasKey ? 'ok' : 'warn'}">${keyLabel}</span>
      <span class="settings-status-sep" aria-hidden="true">·</span>
      <span class="settings-status-item">${costLabel}</span>
    `;
  }

  updateFavoriteButton() {
    if (!this.favoriteModelBtn) return;
    const modelId = this.modelSelect.value;
    const isFavorite = (state.settings.favoriteModels || []).includes(modelId);
    this.favoriteModelBtn.classList.toggle('is-favorite', isFavorite);
    this.favoriteModelBtn.disabled = !modelId;
    this.favoriteModelBtn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
    this.favoriteModelBtn.setAttribute('aria-label', this.favoriteModelBtn.title);
  }

  renderModelQuickPicks() {
    if (!this.modelQuickPicks) return;
    const favorites = state.settings.favoriteModels || [];
    const recent = (state.settings.recentModels || []).filter(id => !favorites.includes(id));
    const modelMap = new Map(this.lastModelList.map(m => [m.id, m.name]));

    const chips = [
      ...favorites.map(id => ({ id, label: modelMap.get(id) || id.split('/').pop(), kind: 'favorite' })),
      ...recent.slice(0, 3).map(id => ({ id, label: modelMap.get(id) || id.split('/').pop(), kind: 'recent' })),
    ];

    if (!chips.length) {
      this.modelQuickPicks.hidden = true;
      this.modelQuickPicks.innerHTML = '';
      return;
    }

    this.modelQuickPicks.hidden = false;
    this.modelQuickPicks.innerHTML = chips.map(chip => `
      <button type="button" class="model-quick-chip model-quick-chip--${chip.kind}" data-model-id="${chip.id}" title="${chip.id}">
        ${chip.kind === 'favorite' ? iconHtml('star', { size: 12, className: 'icon model-quick-chip-icon' }) : ''}
        <span>${chip.label}</span>
      </button>
    `).join('');

    this.modelQuickPicks.querySelectorAll('.model-quick-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.modelId;
        if (!id) return;
        if (Array.from(this.modelSelect.options).some(o => o.value === id)) {
          this.modelSelect.value = id;
          this.modelSelect.dispatchEvent(new Event('change'));
        }
      });
    });
  }

  filterModels(models) {
    if (!this.modelSearchQuery) return models;
    return models.filter(m =>
      m.id.toLowerCase().includes(this.modelSearchQuery)
      || m.name.toLowerCase().includes(this.modelSearchQuery),
    );
  }

  appendModelGroup(select, label, models) {
    if (!models.length) return;
    const group = document.createElement('optgroup');
    group.label = label;
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      group.appendChild(opt);
    });
    select.appendChild(group);
  }

  updateProviderUI() {
    const provider = this.providerSelect.value;
    const info = PROVIDERS[provider];

    if (info) {
      this.providerDescription.textContent = info.description || '';
      this.providerDocsLink.href = info.docsUrl;
      this.providerDocsLink.hidden = false;
    } else {
      this.providerDescription.textContent = '';
      this.providerDocsLink.hidden = true;
    }

    if (this.corsProxyRow) {
      this.corsProxyRow.hidden = !info?.needsCorsProxy;
    }
  }

  handleProviderChange() {
    const provider = this.providerSelect.value;
    this.apiKeyInput.value = provider ? state.getApiKey(provider) : '';
    this.keyStatus.className = 'key-status';
    this.keyStatus.textContent = '';
    this.testKeyBtn.disabled = !this.apiKeyInput.value;
    if (this.modelSearch) this.modelSearch.value = '';
    this.modelSearchQuery = '';
    state.updateSettings({ provider, model: '' });
    this.updateProviderUI();
    this.fetchModels(false);
    this.updateSettingsStatus();
  }

  handleKeyInput() {
    const provider = this.providerSelect.value;
    const key = this.apiKeyInput.value.trim();
    this.testKeyBtn.disabled = !key;
    if (provider) state.setApiKey(provider, key);
    this.updateSettingsStatus();
  }

  toggleKeyVisibility() {
    const isPass = this.apiKeyInput.type === 'password';
    this.apiKeyInput.type = isPass ? 'text' : 'password';
    if (this.toggleKeyVisibilityBtn) {
      this.toggleKeyVisibilityBtn.classList.toggle('key-visible', isPass);
      const label = isPass ? 'Hide API key' : 'Show API key';
      this.toggleKeyVisibilityBtn.setAttribute('aria-label', label);
      this.toggleKeyVisibilityBtn.setAttribute('title', label);
    }
  }

  showStatus(text, type) {
    this.keyStatus.className = `key-status ${type}`;
    if (type === 'success') {
      this.keyStatus.innerHTML = `${iconHtml('check', { size: 14, className: 'icon icon-status' })}<span>${text}</span>`;
    } else if (type === 'error') {
      this.keyStatus.innerHTML = `${iconHtml('x', { size: 14, className: 'icon icon-status' })}<span>${text}</span>`;
    } else {
      this.keyStatus.textContent = text;
    }
  }

  async testConnection() {
    const providerName = this.providerSelect.value;
    const key = this.apiKeyInput.value.trim();
    if (!providerName || !key) return;

    this.keyStatus.className = 'key-status loading';
    this.keyStatus.textContent = 'Verifying…';

    try {
      const adapter = createProvider(providerName, key, state.settings.corsProxyUrl);
      const res = await adapter.validateKey();
      if (res.valid) {
        this.showStatus('Key verified', 'success');
        this.fetchModels(true);
      } else {
        this.showStatus(res.message, 'error');
      }
    } catch (e) {
      this.showStatus(e.message, 'error');
    }
  }

  async fetchModels(forceFetch = false) {
    const providerName = this.providerSelect.value;
    const key = this.apiKeyInput.value.trim();
    this.modelSelect.innerHTML = '';

    if (!providerName) {
      this.modelSelect.disabled = true;
      this.refreshModelsBtn.disabled = true;
      this.modelSelect.innerHTML = '<option value="">Select provider first…</option>';
      return;
    }

    this.modelSelect.disabled = false;
    this.refreshModelsBtn.disabled = false;

    if (!key && providerName !== 'openrouter') {
      const adapter = createProvider(providerName, '', state.settings.corsProxyUrl);
      this.availableModels = adapter.getDefaultModels();
      this.renderModelOptions(this.availableModels);
      return;
    }

    this.refreshModelsBtn.classList.add('spinning');
    this.modelSelect.innerHTML = '<option value="">Loading…</option>';

    try {
      const adapter = createProvider(providerName, key, state.settings.corsProxyUrl);
      this.availableModels = await adapter.listModels();
      this.renderModelOptions(this.availableModels);
    } catch {
      const adapter = createProvider(providerName, '', state.settings.corsProxyUrl);
      this.availableModels = adapter.getDefaultModels();
      this.renderModelOptions(this.availableModels);
    } finally {
      this.refreshModelsBtn.classList.remove('spinning');
    }
  }

  renderModelOptions(models) {
    this.lastModelList = models;
    this.modelSelect.innerHTML = '';

    if (!models.length) {
      this.modelSelect.innerHTML = '<option value="">No models available</option>';
      this.updateFavoriteButton();
      this.renderModelQuickPicks();
      return;
    }

    const filtered = this.filterModels(models);
    if (!filtered.length) {
      this.modelSelect.innerHTML = '<option value="">No models match search</option>';
      this.updateFavoriteButton();
      this.renderModelQuickPicks();
      return;
    }

    const favorites = (state.settings.favoriteModels || [])
      .map(id => filtered.find(m => m.id === id))
      .filter(Boolean);
    const recent = (state.settings.recentModels || [])
      .map(id => filtered.find(m => m.id === id))
      .filter(m => m && !favorites.some(f => f.id === m.id));
    const usedIds = new Set([...favorites, ...recent].map(m => m.id));
    const rest = filtered.filter(m => !usedIds.has(m.id));

    if (favorites.length) this.appendModelGroup(this.modelSelect, 'Favorites', favorites);
    if (recent.length) this.appendModelGroup(this.modelSelect, 'Recent', recent);
    if (rest.length) {
      this.appendModelGroup(this.modelSelect, usedIds.size ? 'All models' : 'Models', rest);
    }

    if (!this.modelSelect.options.length && filtered.length) {
      filtered.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        this.modelSelect.appendChild(opt);
      });
    }

    const current = state.settings.model;
    if (current && Array.from(this.modelSelect.options).some(o => o.value === current)) {
      this.modelSelect.value = current;
    } else {
      const first = this.modelSelect.options[0]?.value || '';
      this.modelSelect.value = first;
      if (first) state.updateSettings({ model: first });
    }

    this.modelHint.textContent = getModelHint(this.modelSelect.value);
    this.updateFavoriteButton();
    this.renderModelQuickPicks();
    this.renderCompareModelChecks(models);
    this.updateSettingsStatus();
  }

  renderCompareModelChecks(models = this.lastModelList) {
    if (!this.compareModelChecks) return;
    const selected = (state.settings.compareModels || []).slice(0, MAX_COMPARE_MODELS);
    if (selected.length !== (state.settings.compareModels || []).length) {
      state.updateSettings({ compareModels: selected });
    }

    this.compareModelChecks.innerHTML = models.map(m => {
      const isChecked = selected.includes(m.id);
      const atLimit = selected.length >= MAX_COMPARE_MODELS && !isChecked;
      return `
      <label class="compare-check${atLimit ? ' compare-check--disabled' : ''}">
        <input type="checkbox" value="${m.id}" ${isChecked ? 'checked' : ''} ${atLimit ? 'disabled' : ''} />
        <span>${m.name}</span>
      </label>
    `;
    }).join('');

    if (this.compareModelsHint) {
      this.compareModelsHint.textContent = selected.length
        ? `${selected.length} of ${MAX_COMPARE_MODELS} selected`
        : `Pick up to ${MAX_COMPARE_MODELS} models`;
    }

    this.compareModelChecks.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => {
        const checked = Array.from(this.compareModelChecks.querySelectorAll('input:checked'))
          .map(el => el.value);
        if (checked.length > MAX_COMPARE_MODELS) {
          input.checked = false;
          showToast(`You can compare up to ${MAX_COMPARE_MODELS} models`, { isError: true });
          return;
        }
        state.updateSettings({ compareModels: checked });
        this.renderCompareModelChecks(models);
      });
    });
  }

  getModelListForPicker() {
    return this.lastModelList.length ? this.lastModelList : [];
  }
}
