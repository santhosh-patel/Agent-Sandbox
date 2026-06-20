// ========================================
// Shared credentials — API keys & provider defaults (single localStorage source)
// ========================================

const STORAGE_KEY = 'ai-playground-credentials';
const LEGACY_PLAYGROUND_KEY = 'ai-playground-state';
const LEGACY_RAG_KEY = 'rag-sandbox-state';
const PREFIX = 'cred_';

const _listeners = new Set();

function decodeLegacy(encoded) {
  if (!encoded) return '';
  try {
    const decoded = atob(encoded);
    if (decoded.startsWith(PREFIX)) return decoded.slice(PREFIX.length);
    if (decoded.startsWith('aipg_')) return decoded.slice(5);
    if (decoded.startsWith('rag_')) return decoded.slice(4);
    return decoded;
  } catch {
    return '';
  }
}

function encodeKey(key) {
  return key ? btoa(PREFIX + key) : '';
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    apiKeys: {},
    corsProxyUrl: '',
    sharedDefaults: {
      chatProvider: '',
      chatModel: '',
      embeddingProvider: '',
      embeddingModel: '',
    },
  };
}

function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('Failed to save credentials:', e);
  }
}

function migrateFromLegacy() {
  const store = loadStore();
  let changed = false;

  const mergeKeys = (legacyKeys) => {
    if (!legacyKeys || typeof legacyKeys !== 'object') return;
    for (const [provider, encoded] of Object.entries(legacyKeys)) {
      const decoded = decodeLegacy(encoded);
      if (!decoded) continue;
      const existing = decodeLegacy(store.apiKeys[provider]);
      if (!existing) {
        store.apiKeys[provider] = encodeKey(decoded);
        changed = true;
      }
    }
  };

  try {
    const pgRaw = localStorage.getItem(LEGACY_PLAYGROUND_KEY);
    if (pgRaw) {
      const pg = JSON.parse(pgRaw);
      mergeKeys(pg.apiKeys);
      if (pg.settings?.corsProxyUrl && !store.corsProxyUrl) {
        store.corsProxyUrl = pg.settings.corsProxyUrl;
        changed = true;
      }
      if (pg.settings?.provider && !store.sharedDefaults.chatProvider) {
        store.sharedDefaults.chatProvider = pg.settings.provider;
        store.sharedDefaults.chatModel = pg.settings.model || '';
        changed = true;
      }
    }
  } catch { /* ignore */ }

  try {
    const ragRaw = localStorage.getItem(LEGACY_RAG_KEY);
    if (ragRaw) {
      const rag = JSON.parse(ragRaw);
      mergeKeys(rag.apiKeys);
      if (rag.settings?.corsProxyUrl && !store.corsProxyUrl) {
        store.corsProxyUrl = rag.settings.corsProxyUrl;
        changed = true;
      }
      if (rag.settings?.chatProvider && !store.sharedDefaults.chatProvider) {
        store.sharedDefaults.chatProvider = rag.settings.chatProvider;
        store.sharedDefaults.chatModel = rag.settings.chatModel || '';
        changed = true;
      }
      if (rag.settings?.embeddingProvider && !store.sharedDefaults.embeddingProvider) {
        store.sharedDefaults.embeddingProvider = rag.settings.embeddingProvider;
        store.sharedDefaults.embeddingModel = rag.settings.embeddingModel || '';
        changed = true;
      }
    }
  } catch { /* ignore */ }

  if (changed) saveStore(store);
  return store;
}

let _store = migrateFromLegacy();

function emit(event, data) {
  _listeners.forEach(fn => fn(event, data));
}

export const credentials = {
  on(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },

  getApiKey(provider) {
    if (!provider) return '';
    return decodeLegacy(_store.apiKeys[provider]);
  },

  hasApiKey(provider) {
    return !!this.getApiKey(provider);
  },

  setApiKey(provider, key) {
    if (!provider) return;
    if (key) {
      _store.apiKeys[provider] = encodeKey(key);
    } else {
      delete _store.apiKeys[provider];
    }
    saveStore(_store);
    emit('apikey-changed', { provider, hasKey: !!key });
  },

  getCorsProxyUrl() {
    return _store.corsProxyUrl || '';
  },

  setCorsProxyUrl(url) {
    _store.corsProxyUrl = url || '';
    saveStore(_store);
    emit('cors-changed', { url: _store.corsProxyUrl });
  },

  getSharedDefaults() {
    return { ..._store.sharedDefaults };
  },

  updateSharedDefaults(partial) {
    _store.sharedDefaults = { ..._store.sharedDefaults, ...partial };
    saveStore(_store);
    emit('defaults-changed', _store.sharedDefaults);
  },

  /** Sync encoded keys back into legacy state blobs for backward compatibility */
  syncLegacyState() {
    try {
      const pgRaw = localStorage.getItem(LEGACY_PLAYGROUND_KEY);
      if (pgRaw) {
        const pg = JSON.parse(pgRaw);
        pg.apiKeys = { ..._store.apiKeys };
        if (pg.settings) pg.settings.corsProxyUrl = _store.corsProxyUrl;
        localStorage.setItem(LEGACY_PLAYGROUND_KEY, JSON.stringify(pg));
      }
    } catch { /* ignore */ }
    try {
      const ragRaw = localStorage.getItem(LEGACY_RAG_KEY);
      if (ragRaw) {
        const rag = JSON.parse(ragRaw);
        rag.apiKeys = { ..._store.apiKeys };
        if (rag.settings) rag.settings.corsProxyUrl = _store.corsProxyUrl;
        localStorage.setItem(LEGACY_RAG_KEY, JSON.stringify(rag));
      }
    } catch { /* ignore */ }
  },

  getConfiguredProviders() {
    return Object.keys(_store.apiKeys).filter(p => this.getApiKey(p));
  },
};
