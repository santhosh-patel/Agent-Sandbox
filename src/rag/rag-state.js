// ========================================
// RAG State Manager — Collections, documents, settings
// ========================================

import { DEFAULT_RAG_SETTINGS, ALL_PROVIDER_IDS } from './rag-providers.js';
import { credentials } from '../shared/credentials.js';
import { createId } from '../shared/id.js';
import { saveCollectionToDb, loadAllCollectionsFromDb, migrateCollectionsToDb, deleteCollectionFromDb } from './rag-db.js';

const STORAGE_KEY = 'rag-sandbox-state';

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
          settings: {
            ...DEFAULT_RAG_SETTINGS,
            ...parsed.settings,
            corsProxyUrl: credentials.getCorsProxyUrl() || parsed.settings?.corsProxyUrl || '',
          },
          apiKeys: parsed.apiKeys || {},
          messages: parsed.messages || [],
          usage: parsed.usage || { tokens: 0, cost: 0, requests: 0, latency: [] },
          evalSets: parsed.evalSets || {},
          evalRuns: parsed.evalRuns || [],
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
      evalSets: {},
      evalRuns: [],
    };
  }

  async initFromDb() {
    try {
      const dbCollections = await loadAllCollectionsFromDb();
      if (dbCollections.length) {
        for (const dbCol of dbCollections) {
          const idx = this._state.collections.findIndex(c => c.id === dbCol.id);
          if (idx >= 0) {
            this._state.collections[idx] = dbCol;
          } else {
            this._state.collections.push(dbCol);
          }
        }
      } else if (this._state.collections.some(c => c.documents?.length)) {
        await migrateCollectionsToDb(this._state.collections);
      }
      this._saveState();
      this._emit('collections-changed');
    } catch (e) {
      console.warn('IDB init failed:', e);
    }
  }

  async _persistCollectionsToDb() {
    try {
      for (const col of this._state.collections) {
        await saveCollectionToDb(col);
      }
    } catch (e) {
      console.warn('IDB save failed:', e);
    }
  }

  _saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
      this._persistCollectionsToDb();
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
    deleteCollectionFromDb(id).catch(() => {});
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
    if (updates.corsProxyUrl !== undefined) {
      credentials.setCorsProxyUrl(updates.corsProxyUrl);
    }
    if (updates.chatProvider || updates.chatModel) {
      credentials.updateSharedDefaults({
        chatProvider: this._state.settings.chatProvider,
        chatModel: this._state.settings.chatModel,
      });
    }
    if (updates.embeddingProvider || updates.embeddingModel) {
      credentials.updateSharedDefaults({
        embeddingProvider: this._state.settings.embeddingProvider,
        embeddingModel: this._state.settings.embeddingModel,
      });
    }
    this._saveState();
    this._emit('settings-changed', this._state.settings);
  }

  setApiKey(provider, key) {
    credentials.setApiKey(provider, key);
    this._saveState();
    this._emit('apikey-changed', { provider, hasKey: !!key });
  }

  getApiKey(provider) {
    return credentials.getApiKey(provider);
  }

  hasApiKey(provider) {
    return credentials.hasApiKey(provider);
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

  getEvalSet(collectionId) {
    return this._state.evalSets[collectionId] || { id: createId(), name: 'Default eval set', questions: [] };
  }

  saveEvalSet(collectionId, evalSet) {
    this._state.evalSets[collectionId] = evalSet;
    this._saveState();
    this._emit('eval-changed', { collectionId });
  }

  addEvalQuestion(collectionId, query, expectedKeywords = '', notes = '') {
    const set = this.getEvalSet(collectionId);
    set.questions.push({ id: createId(), query, expectedKeywords, notes });
    this.saveEvalSet(collectionId, set);
  }

  removeEvalQuestion(collectionId, questionId) {
    const set = this.getEvalSet(collectionId);
    set.questions = set.questions.filter(q => q.id !== questionId);
    this.saveEvalSet(collectionId, set);
  }

  addEvalRun(run) {
    this._state.evalRuns.unshift({ ...run, id: createId(), createdAt: Date.now() });
    if (this._state.evalRuns.length > 20) this._state.evalRuns.length = 20;
    this._saveState();
    this._emit('eval-run-added', run);
  }

  getEvalRuns(collectionId) {
    return this._state.evalRuns.filter(r => r.collectionId === collectionId);
  }

  applySharedDefaults() {
    const defaults = credentials.getSharedDefaults();
    const updates = {};
    if (defaults.chatProvider && !this._state.settings.chatProvider) {
      updates.chatProvider = defaults.chatProvider;
      updates.chatModel = defaults.chatModel || this._state.settings.chatModel;
    }
    if (defaults.embeddingProvider && !this._state.settings.embeddingProvider) {
      updates.embeddingProvider = defaults.embeddingProvider;
      updates.embeddingModel = defaults.embeddingModel || this._state.settings.embeddingModel;
    }
    if (Object.keys(updates).length) this.updateSettings(updates);
  }
}

export const ragState = new RagStateManager();
export { createId };
