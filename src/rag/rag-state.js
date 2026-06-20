// ========================================
// RAG State Manager — Collections, documents, settings
// ========================================

import { DEFAULT_RAG_SETTINGS, ALL_PROVIDER_IDS } from './rag-providers.js';

const STORAGE_KEY = 'rag-sandbox-state';

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createCollection(name = 'New Collection') {
  return {
    id: createId(),
    name,
    documents: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function createDocument(name, content, type) {
  return {
    id: createId(),
    name,
    type,
    content,
    chunks: [],
    status: 'pending',
    size: content.length,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

class RagStateManager {
  constructor() {
    this._listeners = new Map();
    this._state = this._loadState();
    if (!this._state.activeCollectionId && this._state.collections.length > 0) {
      this._state.activeCollectionId = this._state.collections[0].id;
    }
  }

  _loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          collections: parsed.collections || [],
          activeCollectionId: parsed.activeCollectionId || '',
          settings: { ...DEFAULT_RAG_SETTINGS, ...parsed.settings },
          apiKeys: parsed.apiKeys || {},
          messages: parsed.messages || [],
          usage: parsed.usage || { tokens: 0, cost: 0, requests: 0, latency: [] },
        };
      }
    } catch (e) {
      console.warn('Failed to load RAG state:', e);
    }
    const defaultCollection = createCollection('Default Knowledge Base');
    return {
      collections: [defaultCollection],
      activeCollectionId: defaultCollection.id,
      settings: { ...DEFAULT_RAG_SETTINGS },
      apiKeys: {},
      messages: [],
      usage: { tokens: 0, cost: 0, requests: 0, latency: [] },
    };
  }

  _saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    } catch (e) {
      console.warn('Failed to save RAG state:', e);
    }
  }

  _emit(event, data) {
    const listeners = this._listeners.get(event) || [];
    listeners.forEach(fn => fn(data));
  }

  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
    return () => {
      const arr = this._listeners.get(event);
      const idx = arr.indexOf(fn);
      if (idx > -1) arr.splice(idx, 1);
    };
  }

  get collections() { return this._state.collections; }
  get settings() { return this._state.settings; }
  get messages() { return this._state.messages; }
  get usage() { return this._state.usage; }

  getActiveCollection() {
    return this._state.collections.find(c => c.id === this._state.activeCollectionId) || null;
  }

  setActiveCollection(id) {
    if (!this._state.collections.find(c => c.id === id)) return;
    this._state.activeCollectionId = id;
    this._state.messages = [];
    this._saveState();
    this._emit('collection-changed', { id });
  }

  createCollection(name) {
    const collection = createCollection(name);
    this._state.collections.push(collection);
    this._state.activeCollectionId = collection.id;
    this._saveState();
    this._emit('collections-changed');
    return collection;
  }

  deleteCollection(id) {
    const idx = this._state.collections.findIndex(c => c.id === id);
    if (idx === -1) return;
    this._state.collections.splice(idx, 1);
    if (this._state.activeCollectionId === id) {
      this._state.activeCollectionId = this._state.collections[0]?.id || '';
    }
    if (this._state.collections.length === 0) {
      const c = createCollection('Default Knowledge Base');
      this._state.collections.push(c);
      this._state.activeCollectionId = c.id;
    }
    this._saveState();
    this._emit('collections-changed');
  }

  renameCollection(id, name) {
    const collection = this._state.collections.find(c => c.id === id);
    if (!collection) return;
    collection.name = name;
    collection.updatedAt = Date.now();
    this._saveState();
    this._emit('collections-changed');
  }

  addDocument(collectionId, name, content, type) {
    const collection = this._state.collections.find(c => c.id === collectionId);
    if (!collection) return null;
    const doc = createDocument(name, content, type);
    collection.documents.push(doc);
    collection.updatedAt = Date.now();
    this._saveState();
    this._emit('documents-changed', { collectionId });
    return doc;
  }

  deleteDocument(collectionId, docId) {
    const collection = this._state.collections.find(c => c.id === collectionId);
    if (!collection) return;
    const idx = collection.documents.findIndex(d => d.id === docId);
    if (idx === -1) return;
    collection.documents.splice(idx, 1);
    collection.updatedAt = Date.now();
    this._saveState();
    this._emit('documents-changed', { collectionId });
  }

  updateDocumentChunks(collectionId, docId, chunks) {
    const collection = this._state.collections.find(c => c.id === collectionId);
    if (!collection) return;
    const doc = collection.documents.find(d => d.id === docId);
    if (!doc) return;
    doc.chunks = chunks;
    doc.status = 'indexed';
    doc.updatedAt = Date.now();
    collection.updatedAt = Date.now();
    this._saveState();
    this._emit('documents-changed', { collectionId });
  }

  setDocumentStatus(collectionId, docId, status) {
    const collection = this._state.collections.find(c => c.id === collectionId);
    if (!collection) return;
    const doc = collection.documents.find(d => d.id === docId);
    if (!doc) return;
    doc.status = status;
    this._emit('documents-changed', { collectionId });
  }

  getAllChunks(collectionId) {
    const collection = this._state.collections.find(c => c.id === collectionId);
    if (!collection) return [];
    const chunks = [];
    for (const doc of collection.documents) {
      for (const chunk of doc.chunks) {
        chunks.push({
          ...chunk,
          docId: doc.id,
          docName: doc.name,
        });
      }
    }
    return chunks;
  }

  updateSettings(updates) {
    this._state.settings = { ...this._state.settings, ...updates };
    this._saveState();
    this._emit('settings-changed', this._state.settings);
  }

  setApiKey(provider, key) {
    this._state.apiKeys[provider] = key ? btoa('rag_' + key) : '';
    this._saveState();
    this._emit('apikey-changed', { provider, hasKey: !!key });
  }

  getApiKey(provider) {
    const encoded = this._state.apiKeys[provider];
    if (!encoded) return '';
    try {
      const decoded = atob(encoded);
      return decoded.startsWith('rag_') ? decoded.slice(4) : decoded;
    } catch {
      return '';
    }
  }

  hasApiKey(provider) {
    return !!this.getApiKey(provider);
  }

  addMessage(message) {
    this._state.messages.push({
      ...message,
      id: createId(),
      createdAt: Date.now(),
    });
    this._saveState();
    this._emit('message-added');
  }

  updateLastMessage(updates) {
    const last = this._state.messages[this._state.messages.length - 1];
    if (!last) return;
    Object.assign(last, updates);
    this._saveState();
    this._emit('message-updated');
  }

  clearMessages() {
    this._state.messages = [];
    this._saveState();
    this._emit('messages-cleared');
  }

  recordUsage(tokens, cost, latency) {
    this._state.usage.tokens += tokens;
    this._state.usage.cost += cost || 0;
    this._state.usage.requests += 1;
    if (latency) this._state.usage.latency.push(latency);
    this._saveState();
    this._emit('usage-changed');
  }

  exportCollection(collectionId) {
    const collection = this._state.collections.find(c => c.id === collectionId);
    if (!collection) return null;
    return JSON.stringify({
      version: 1,
      exportedAt: Date.now(),
      collection: {
        name: collection.name,
        documents: collection.documents.map(d => ({
          name: d.name,
          type: d.type,
          content: d.content,
          chunks: d.chunks,
        })),
        settings: this._state.settings,
      },
    }, null, 2);
  }

  importCollection(json) {
    const data = JSON.parse(json);
    const collection = createCollection(data.collection?.name || 'Imported Collection');
    if (data.collection?.documents) {
      for (const d of data.collection.documents) {
        const doc = createDocument(d.name, d.content, d.type);
        doc.chunks = d.chunks || [];
        doc.status = doc.chunks.length ? 'indexed' : 'pending';
        collection.documents.push(doc);
      }
    }
    this._state.collections.push(collection);
    this._state.activeCollectionId = collection.id;
    this._saveState();
    this._emit('collections-changed');
    return collection;
  }

  isConfigured() {
    const s = this._state.settings;
    const hasEmbedKey = this.hasApiKey(s.embeddingProvider);
    const hasChatKey = this.hasApiKey(s.chatProvider);
    const embedProvider = ALL_PROVIDER_IDS.includes(s.embeddingProvider);
    const chatProvider = ALL_PROVIDER_IDS.includes(s.chatProvider);
    return embedProvider && chatProvider && hasEmbedKey && hasChatKey && s.embeddingModel && s.chatModel;
  }

  getSetupIssues() {
    const issues = [];
    const s = this._state.settings;
    if (!s.embeddingProvider) issues.push('Select an embedding provider');
    if (!s.embeddingModel) issues.push('Select an embedding model');
    if (!this.hasApiKey(s.embeddingProvider)) issues.push('Add embedding API key');
    if (!s.chatProvider) issues.push('Select a chat provider');
    if (!s.chatModel) issues.push('Select a chat model');
    if (!this.hasApiKey(s.chatProvider)) issues.push('Add chat API key');
    return issues;
  }
}

export const ragState = new RagStateManager();
export { createId };
