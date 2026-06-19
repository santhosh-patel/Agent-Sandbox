import { state } from '../state.js';
import { PROVIDERS, createProvider } from '../providers/registry.js';

export class SettingsUI {
  constructor() {
    this.panel = document.getElementById('settings-panel');
    this.overlay = document.getElementById('overlay');
    this.edgeToggle = document.getElementById('settings-edge-toggle');
    this.mobileToggle = document.getElementById('settings-toggle-mobile');

    // Form inputs
    this.providerSelect = document.getElementById('provider-select');
    this.apiKeyInput = document.getElementById('api-key-input');
    this.toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
    this.testKeyBtn = document.getElementById('test-key-btn');
    this.keyStatus = document.getElementById('key-status');
    
    // CORS Proxy
    this.corsProxyRow = document.getElementById('cors-proxy-row');
    this.corsProxyInput = document.getElementById('cors-proxy-input');

    // Model selection
    this.modelSelect = document.getElementById('model-select');
    this.refreshModelsBtn = document.getElementById('refresh-models-btn');

    // Prompt & Params
    this.systemPrompt = document.getElementById('system-prompt');
    this.reasoningToggle = document.getElementById('reasoning-toggle');
    this.reasoningEffortRow = document.getElementById('reasoning-effort-row');
    this.temperatureSlider = document.getElementById('temperature-slider');
    this.temperatureValue = document.getElementById('temperature-value');
    this.maxTokensInput = document.getElementById('max-tokens-input');
    this.topPSlider = document.getElementById('top-p-slider');
    this.topPValue = document.getElementById('top-p-value');
    this.freqPenaltySlider = document.getElementById('freq-penalty-slider');
    this.freqPenaltyValue = document.getElementById('freq-penalty-value');
    this.presPenaltySlider = document.getElementById('pres-penalty-slider');
    this.presPenaltyValue = document.getElementById('pres-penalty-value');

    this.init();
  }

  init() {
    if (this.mobileToggle) {
      this.mobileToggle.addEventListener('click', () => this.togglePanel());
    }
    if (this.edgeToggle) {
      this.edgeToggle.addEventListener('click', () => this.togglePanel());
    }
    this.overlay.addEventListener('click', () => this.collapsePanel());

    // Bind event handlers
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
    });

    this.systemPrompt.addEventListener('input', () => {
      state.updateSettings({ systemPrompt: this.systemPrompt.value });
    });

    this.reasoningToggle.addEventListener('change', () => {
      const enabled = this.reasoningToggle.checked;
      this.reasoningEffortRow.style.display = enabled ? 'block' : 'none';
      state.updateSettings({ reasoningMode: enabled });
    });

    // Reasoning effort buttons
    document.querySelectorAll('.effort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.effort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.updateSettings({ reasoningEffort: btn.getAttribute('data-effort') });
      });
    });

    // Sliders
    this.bindSlider(this.temperatureSlider, this.temperatureValue, 'temperature');
    this.bindSlider(this.topPSlider, this.topPValue, 'topP');
    this.bindSlider(this.freqPenaltySlider, this.freqPenaltyValue, 'frequencyPenalty');
    this.bindSlider(this.presPenaltySlider, this.presPenaltyValue, 'presencePenalty');

    this.maxTokensInput.addEventListener('input', () => {
      state.updateSettings({ maxTokens: parseInt(this.maxTokensInput.value, 10) || 4096 });
    });

    // Load initial values from state
    this.loadStateValues();

    const stored = localStorage.getItem('settings-collapsed');
    const collapsed = stored !== null ? stored === 'true' : this.isMobile();
    this.setCollapsed(collapsed);
  }

  isMobile() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  openPanel() {
    this.expandPanel();
  }

  closePanel() {
    this.collapsePanel();
  }

  expandPanel() {
    this.setCollapsed(false);
  }

  collapsePanel() {
    this.setCollapsed(true);
  }

  togglePanel() {
    this.setCollapsed(!this.panel.classList.contains('collapsed'));
  }

  setCollapsed(collapsed) {
    this.panel.classList.toggle('collapsed', collapsed);
    document.body.classList.toggle('settings-collapsed', collapsed);
    if (this.overlay) {
      this.overlay.classList.toggle('visible', !collapsed && this.isMobile());
    }
    localStorage.setItem('settings-collapsed', collapsed);
  }

  bindSlider(slider, valueDisplay, settingKey) {
    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueDisplay.innerText = val.toFixed(1);
      state.updateSettings({ [settingKey]: val });
    });
  }

  loadStateValues() {
    const settings = state.settings;

    this.providerSelect.value = settings.provider || '';
    this.corsProxyInput.value = settings.corsProxyUrl || '';
    
    // Load key if provider exists
    if (settings.provider) {
      this.apiKeyInput.value = state.getApiKey(settings.provider);
      this.testKeyBtn.disabled = !this.apiKeyInput.value;
    } else {
      this.apiKeyInput.value = '';
      this.testKeyBtn.disabled = true;
    }

    this.systemPrompt.value = settings.systemPrompt || '';
    this.reasoningToggle.checked = !!settings.reasoningMode;
    this.reasoningEffortRow.style.display = settings.reasoningMode ? 'block' : 'none';

    // Set active reasoning button
    document.querySelectorAll('.effort-btn').forEach(btn => {
      if (btn.getAttribute('data-effort') === settings.reasoningEffort) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.temperatureSlider.value = settings.temperature;
    this.temperatureValue.innerText = settings.temperature.toFixed(1);

    this.maxTokensInput.value = settings.maxTokens;

    this.topPSlider.value = settings.topP;
    this.topPValue.innerText = settings.topP.toFixed(1);

    this.freqPenaltySlider.value = settings.frequencyPenalty;
    this.freqPenaltyValue.innerText = settings.frequencyPenalty.toFixed(1);

    this.presPenaltySlider.value = settings.presencePenalty;
    this.presPenaltyValue.innerText = settings.presencePenalty.toFixed(1);

    this.updateProviderRowStyles();
    this.fetchModels(false);
  }

  updateProviderRowStyles() {
    const provider = this.providerSelect.value;
    const info = PROVIDERS[provider];
    
    if (info && info.needsCorsProxy) {
      this.corsProxyRow.style.display = 'block';
    } else {
      this.corsProxyRow.style.display = 'none';
    }
  }

  handleProviderChange() {
    const provider = this.providerSelect.value;
    
    // Reset key input and status
    this.apiKeyInput.value = provider ? state.getApiKey(provider) : '';
    this.keyStatus.className = 'key-status';
    this.keyStatus.innerText = '';
    this.testKeyBtn.disabled = !this.apiKeyInput.value;

    state.updateSettings({
      provider,
      model: '', // Reset model on provider change
    });

    this.updateProviderRowStyles();
    this.fetchModels(false);
  }

  handleKeyInput() {
    const provider = this.providerSelect.value;
    const key = this.apiKeyInput.value.trim();
    
    this.testKeyBtn.disabled = !key;
    if (provider) {
      state.setApiKey(provider, key);
    }
  }

  toggleKeyVisibility() {
    const isPass = this.apiKeyInput.type === 'password';
    this.apiKeyInput.type = isPass ? 'text' : 'password';
    this.toggleKeyVisibilityBtn.querySelector('svg').style.color = isPass ? 'var(--accent)' : '';
  }

  async testConnection() {
    const providerName = this.providerSelect.value;
    const key = this.apiKeyInput.value.trim();
    if (!providerName || !key) return;

    this.keyStatus.className = 'key-status loading';
    this.keyStatus.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning" style="animation: spin 1s linear infinite">
        <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="6.34" y1="17.66" x2="8.46" y2="15.54"/><line x1="15.54" y1="8.46" x2="17.66" y2="6.34"/>
      </svg>
      Testing connection...
    `;

    try {
      const adapter = createProvider(providerName, key, state.settings.corsProxyUrl);
      const res = await adapter.validateKey();
      
      if (res.valid) {
        this.keyStatus.className = 'key-status success';
        this.keyStatus.innerText = '✓ Connection success';
        // Auto refresh models on successful connect
        this.fetchModels(true);
      } else {
        this.keyStatus.className = 'key-status error';
        this.keyStatus.innerText = `✗ ${res.message}`;
      }
    } catch (e) {
      this.keyStatus.className = 'key-status error';
      this.keyStatus.innerText = `✗ Connection failed: ${e.message}`;
    }
  }

  async fetchModels(forceFetch = false) {
    const providerName = this.providerSelect.value;
    const key = this.apiKeyInput.value.trim();

    this.modelSelect.innerHTML = '';

    if (!providerName) {
      this.modelSelect.disabled = true;
      this.refreshModelsBtn.disabled = true;
      this.modelSelect.innerHTML = '<option value="">Select provider first...</option>';
      return;
    }

    this.modelSelect.disabled = false;
    this.refreshModelsBtn.disabled = false;

    // Use default models if key is missing (for quick preview/testing)
    if (!key && providerName !== 'openrouter') {
      const adapter = createProvider(providerName, '', state.settings.corsProxyUrl);
      const defaults = adapter.getDefaultModels();
      this.renderModelOptions(defaults);
      return;
    }

    this.refreshModelsBtn.classList.add('spinning');
    this.modelSelect.innerHTML = '<option value="">Loading models...</option>';

    try {
      const adapter = createProvider(providerName, key, state.settings.corsProxyUrl);
      const models = await adapter.listModels();
      this.renderModelOptions(models);
    } catch (e) {
      console.warn('Failed to fetch models dynamically:', e);
      // Fallback
      const adapter = createProvider(providerName, '', state.settings.corsProxyUrl);
      this.renderModelOptions(adapter.getDefaultModels());
    } finally {
      this.refreshModelsBtn.classList.remove('spinning');
    }
  }

  renderModelOptions(models) {
    this.modelSelect.innerHTML = '';
    
    if (models.length === 0) {
      this.modelSelect.innerHTML = '<option value="">No models available</option>';
      return;
    }

    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.innerText = m.name;
      this.modelSelect.appendChild(opt);
    });

    // Set selected model if it exists in list
    const currentModel = state.settings.model;
    if (currentModel && Array.from(this.modelSelect.options).some(o => o.value === currentModel)) {
      this.modelSelect.value = currentModel;
    } else {
      // Default to first option
      const firstModel = this.modelSelect.options[0]?.value || '';
      this.modelSelect.value = firstModel;
      state.updateSettings({ model: firstModel });
    }
  }
}
