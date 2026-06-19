import { state } from '../state.js';
import { PROVIDERS, createProvider } from '../providers/registry.js';
import { PARAMETER_PRESETS, SYSTEM_PROMPT_PRESETS } from '../data/presets.js';
import { getModelHint } from '../data/model-hints.js';
import { showConfirm } from './modal.js';
import { isMobile, isTablet, onViewportChange, closeMobileSidebar } from './breakpoints.js';
import { iconHtml } from './icons.js';

export class SettingsUI {
  constructor() {
    this.panel = document.getElementById('settings-panel');
    this.overlay = document.getElementById('overlay');
    this.edgeToggle = document.getElementById('settings-edge-toggle');
    this.mobileToggle = document.getElementById('settings-toggle-mobile');
    this.settingsCloseBtn = document.getElementById('settings-close-btn');

    this.providerSelect = document.getElementById('provider-select');
    this.providerDescription = document.getElementById('provider-description');
    this.providerDocsLink = document.getElementById('provider-docs-link');
    this.apiKeyInput = document.getElementById('api-key-input');
    this.toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
    this.testKeyBtn = document.getElementById('test-key-btn');
    this.keyStatus = document.getElementById('key-status');
    this.corsProxyRow = document.getElementById('cors-proxy-row');
    this.corsProxyInput = document.getElementById('cors-proxy-input');
    this.anthropicBanner = document.getElementById('anthropic-banner');
    this.switchOpenRouterBtn = document.getElementById('switch-openrouter-btn');
    this.modelSelect = document.getElementById('model-select');
    this.modelHint = document.getElementById('model-hint');
    this.refreshModelsBtn = document.getElementById('refresh-models-btn');
    this.compareModeToggle = document.getElementById('compare-mode-toggle');
    this.compareModelsRow = document.getElementById('compare-models-row');
    this.compareModelChecks = document.getElementById('compare-model-checks');
    this.presetButtons = document.getElementById('preset-buttons');
    this.systemPromptPresets = document.getElementById('system-prompt-presets');
    this.systemPrompt = document.getElementById('system-prompt');
    this.reasoningToggle = document.getElementById('reasoning-toggle');
    this.reasoningEffortRow = document.getElementById('reasoning-effort-row');
    this.temperatureSlider = document.getElementById('temperature-slider');
    this.temperatureInput = document.getElementById('temperature-input');
    this.maxTokensInput = document.getElementById('max-tokens-input');
    this.topPSlider = document.getElementById('top-p-slider');
    this.topPInput = document.getElementById('top-p-input');
    this.freqPenaltySlider = document.getElementById('freq-penalty-slider');
    this.freqPenaltyInput = document.getElementById('freq-penalty-input');
    this.presPenaltySlider = document.getElementById('pres-penalty-slider');
    this.presPenaltyInput = document.getElementById('pres-penalty-input');
    this.usageStats = document.getElementById('usage-stats');

    this.availableModels = [];
    this.init();
  }

  init() {
    if (this.mobileToggle) this.mobileToggle.addEventListener('click', () => this.togglePanel());
    if (this.settingsCloseBtn) this.settingsCloseBtn.addEventListener('click', () => this.collapsePanel());
    if (this.edgeToggle) this.edgeToggle.addEventListener('click', () => this.togglePanel());
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
      this.modelHint.textContent = getModelHint(this.modelSelect.value);
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

    this.systemPrompt.addEventListener('input', () => {
      const value = this.systemPrompt.value;
      const activeKey = this.getMatchingSystemPromptPreset(value);
      state.updateSettings({
        systemPrompt: value,
        activeSystemPromptPreset: activeKey,
      });
      this.updateSystemPromptPresetButtons(activeKey);
    });

    this.reasoningToggle.addEventListener('change', () => {
      const enabled = this.reasoningToggle.checked;
      this.reasoningEffortRow.style.display = enabled ? 'block' : 'none';
      state.updateSettings({ reasoningMode: enabled });
    });

    document.querySelectorAll('.effort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.effort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.updateSettings({ reasoningEffort: btn.getAttribute('data-effort') });
      });
    });

    this.bindSliderPair(this.temperatureSlider, this.temperatureInput, 'temperature');
    this.bindSliderPair(this.topPSlider, this.topPInput, 'topP');
    this.bindSliderPair(this.freqPenaltySlider, this.freqPenaltyInput, 'frequencyPenalty');
    this.bindSliderPair(this.presPenaltySlider, this.presPenaltyInput, 'presencePenalty');

    this.maxTokensInput.addEventListener('input', () => {
      state.updateSettings({ maxTokens: parseInt(this.maxTokensInput.value, 10) || 4096 });
    });

    this.renderPresets();
    this.renderSystemPromptPresets();
    this.bindDataButtons();

    state.on('usage-updated', () => this.renderUsageStats());
    state.on('settings-changed', () => this.renderUsageStats());

    this.loadStateValues();

    const stored = localStorage.getItem('settings-collapsed');
    const collapsed = stored !== null ? stored === 'true' : this.isOverlayMode();
    this.setCollapsed(collapsed);

    onViewportChange(({ mobile, tablet }) => {
      if (!mobile) closeMobileSidebar();
      if (!tablet && this.overlay) this.overlay.classList.remove('visible');
    });
  }

  renderPresets() {
    if (!this.presetButtons) return;
    this.presetButtons.innerHTML = Object.entries(PARAMETER_PRESETS).map(([key, p]) => `
      <button type="button" class="preset-btn" data-preset="${key}" title="${p.description}">${p.label}</button>
    `).join('');

    this.presetButtons.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = PARAMETER_PRESETS[btn.dataset.preset];
        if (!preset) return;
        state.updateSettings({
          temperature: preset.temperature,
          topP: preset.topP,
          frequencyPenalty: preset.frequencyPenalty,
          presencePenalty: preset.presencePenalty,
          reasoningMode: preset.reasoningMode || false,
          reasoningEffort: preset.reasoningEffort || 'medium',
          activePreset: btn.dataset.preset,
        });
        this.loadStateValues();
      });
    });
  }

  renderSystemPromptPresets() {
    if (!this.systemPromptPresets) return;
    this.systemPromptPresets.innerHTML = Object.entries(SYSTEM_PROMPT_PRESETS).map(([key, p]) => `
      <button type="button" class="preset-btn" data-system-prompt-preset="${key}" title="${p.description}">${p.label}</button>
    `).join('');

    this.systemPromptPresets.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = SYSTEM_PROMPT_PRESETS[btn.dataset.systemPromptPreset];
        if (!preset) return;
        state.updateSettings({
          systemPrompt: preset.prompt,
          activeSystemPromptPreset: btn.dataset.systemPromptPreset,
        });
        this.systemPrompt.value = preset.prompt;
        this.updateSystemPromptPresetButtons(btn.dataset.systemPromptPreset);
      });
    });
  }

  getMatchingSystemPromptPreset(value) {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const match = Object.entries(SYSTEM_PROMPT_PRESETS).find(([, p]) => p.prompt === trimmed);
    return match ? match[0] : '';
  }

  updateSystemPromptPresetButtons(activeKey) {
    if (!this.systemPromptPresets) return;
    this.systemPromptPresets.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.systemPromptPreset === activeKey);
    });
  }

  bindDataButtons() {
    document.getElementById('export-all-btn')?.addEventListener('click', () => {
      const data = state.exportAllChats();
      this.downloadFile('ai-playground-chats.json', data);
    });

    document.getElementById('export-settings-btn')?.addEventListener('click', () => {
      const data = state.exportSettings();
      this.downloadFile('ai-playground-settings.json', data);
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
    if (this.edgeToggle) this.edgeToggle.setAttribute('aria-expanded', String(!collapsed));
    if (this.overlay) this.overlay.classList.toggle('visible', !collapsed && this.isOverlayMode());
    localStorage.setItem('settings-collapsed', collapsed);
  }

  bindSliderPair(slider, input, key) {
    if (!slider || !input) return;
    slider.addEventListener('input', () => {
      input.value = slider.value;
      state.updateSettings({ [key]: parseFloat(slider.value) });
    });
    input.addEventListener('change', () => {
      slider.value = input.value;
      state.updateSettings({ [key]: parseFloat(input.value) });
    });
  }

  loadStateValues() {
    const settings = state.settings;
    this.providerSelect.value = settings.provider || '';
    this.corsProxyInput.value = settings.corsProxyUrl || '';
    this.apiKeyInput.value = settings.provider ? state.getApiKey(settings.provider) : '';
    this.testKeyBtn.disabled = !this.apiKeyInput.value;
    this.systemPrompt.value = settings.systemPrompt || '';
    this.updateSystemPromptPresetButtons(
      settings.activeSystemPromptPreset || this.getMatchingSystemPromptPreset(settings.systemPrompt || ''),
    );
    this.reasoningToggle.checked = !!settings.reasoningMode;
    this.reasoningEffortRow.style.display = settings.reasoningMode ? 'block' : 'none';
    this.compareModeToggle.checked = !!settings.compareMode;
    this.compareModelsRow.hidden = !settings.compareMode;

    document.querySelectorAll('.effort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-effort') === settings.reasoningEffort);
    });

    this.temperatureSlider.value = settings.temperature;
    this.temperatureInput.value = settings.temperature;
    this.maxTokensInput.value = settings.maxTokens;
    this.topPSlider.value = settings.topP;
    this.topPInput.value = settings.topP;
    this.freqPenaltySlider.value = settings.frequencyPenalty;
    this.freqPenaltyInput.value = settings.frequencyPenalty;
    this.presPenaltySlider.value = settings.presencePenalty;
    this.presPenaltyInput.value = settings.presencePenalty;

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === settings.activePreset);
    });

    this.updateProviderUI();
    this.fetchModels(false);
    this.renderUsageStats();
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

    this.corsProxyRow.style.display = info?.needsCorsProxy ? 'block' : 'none';
    this.anthropicBanner.hidden = provider !== 'anthropic';
  }

  handleProviderChange() {
    const provider = this.providerSelect.value;
    this.apiKeyInput.value = provider ? state.getApiKey(provider) : '';
    this.keyStatus.className = 'key-status';
    this.keyStatus.textContent = '';
    this.testKeyBtn.disabled = !this.apiKeyInput.value;
    state.updateSettings({ provider, model: '' });
    this.updateProviderUI();
    this.fetchModels(false);
  }

  handleKeyInput() {
    const provider = this.providerSelect.value;
    const key = this.apiKeyInput.value.trim();
    this.testKeyBtn.disabled = !key;
    if (provider) state.setApiKey(provider, key);
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
    } catch (e) {
      const adapter = createProvider(providerName, '', state.settings.corsProxyUrl);
      this.availableModels = adapter.getDefaultModels();
      this.renderModelOptions(this.availableModels);
    } finally {
      this.refreshModelsBtn.classList.remove('spinning');
    }
  }

  renderModelOptions(models) {
    this.modelSelect.innerHTML = '';
    if (!models.length) {
      this.modelSelect.innerHTML = '<option value="">No models available</option>';
      return;
    }

    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      this.modelSelect.appendChild(opt);
    });

    const current = state.settings.model;
    if (current && Array.from(this.modelSelect.options).some(o => o.value === current)) {
      this.modelSelect.value = current;
    } else {
      const first = this.modelSelect.options[0]?.value || '';
      this.modelSelect.value = first;
      state.updateSettings({ model: first });
    }

    this.modelHint.textContent = getModelHint(this.modelSelect.value);
    this.renderCompareModelChecks(models);
  }

  renderCompareModelChecks(models) {
    if (!this.compareModelChecks) return;
    const selected = state.settings.compareModels || [];
    this.compareModelChecks.innerHTML = models.slice(0, 12).map(m => `
      <label class="compare-check">
        <input type="checkbox" value="${m.id}" ${selected.includes(m.id) ? 'checked' : ''} />
        <span>${m.name}</span>
      </label>
    `).join('');

    this.compareModelChecks.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => {
        const checked = Array.from(this.compareModelChecks.querySelectorAll('input:checked'))
          .map(el => el.value)
          .slice(0, 3);
        if (input.checked && checked.length > 3) {
          input.checked = false;
          return;
        }
        state.updateSettings({ compareModels: checked });
      });
    });
  }

  renderUsageStats() {
    if (!this.usageStats) return;
    const usage = state.getUsageStats();
    const today = new Date().toISOString().slice(0, 10);
    const day = usage.daily[today] || { requests: 0, tokens: 0, cost: 0 };

    this.usageStats.innerHTML = `
      <div class="usage-row"><span>Today</span><span>${day.requests} reqs, ${day.tokens} tokens, $${day.cost.toFixed(4)}</span></div>
      <div class="usage-row"><span>All time</span><span>${usage.total.requests} reqs, ${usage.total.tokens} tokens, $${usage.total.cost.toFixed(4)}</span></div>
    `;
  }
}
