// ========================================
// State Manager — Reactive state with localStorage persistence
// ========================================

const STORAGE_KEY = 'ai-playground-state';

const defaultSettings = {
  provider: '',
  model: '',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  systemPrompt: '',
  reasoningMode: false,
  reasoningEffort: 'medium',
  theme: 'dark',
  corsProxyUrl: '',
};

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createChat(title = 'New Chat') {
  return {
    id: createId(),
    title,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tokenUsage: { prompt: 0, completion: 0, total: 0 },
    totalCost: 0,
  };
}

class StateManager {
  constructor() {
    this._listeners = new Map();
    this._state = this._loadState();
    // Ensure at least one chat exists
    if (Object.keys(this._state.chats).length === 0) {
      const chat = createChat();
      this._state.chats[chat.id] = chat;
      this._state.activeChat = chat.id;
    }
  }

  _loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          activeChat: parsed.activeChat || '',
          chats: parsed.chats || {},
          settings: { ...defaultSettings, ...parsed.settings },
          apiKeys: parsed.apiKeys || {},
        };
      }
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
    return {
      activeChat: '',
      chats: {},
      settings: { ...defaultSettings },
      apiKeys: {},
    };
  }

  _saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    } catch (e) {
      console.warn('Failed to save state:', e);
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

  // --- Getters ---
  get settings() { return this._state.settings; }
  get chats() { return this._state.chats; }
  get activeChat() { return this._state.activeChat; }
  get apiKeys() { return this._state.apiKeys; }

  getActiveChat() {
    return this._state.chats[this._state.activeChat] || null;
  }

  getChatList() {
    return Object.values(this._state.chats)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // --- Setters ---
  updateSettings(partial) {
    this._state.settings = { ...this._state.settings, ...partial };
    this._saveState();
    this._emit('settings-changed', this._state.settings);
  }

  setApiKey(provider, key) {
    // Simple base64 obfuscation
    this._state.apiKeys[provider] = key ? btoa('aipg_' + key) : '';
    this._saveState();
    this._emit('apikey-changed', { provider, hasKey: !!key });
  }

  getApiKey(provider) {
    const encoded = this._state.apiKeys[provider];
    if (!encoded) return '';
    try {
      const decoded = atob(encoded);
      return decoded.startsWith('aipg_') ? decoded.slice(5) : decoded;
    } catch {
      return '';
    }
  }

  setActiveChat(chatId) {
    if (this._state.chats[chatId]) {
      this._state.activeChat = chatId;
      this._saveState();
      this._emit('chat-switched', chatId);
    }
  }

  createNewChat() {
    const chat = createChat();
    this._state.chats[chat.id] = chat;
    this._state.activeChat = chat.id;
    this._saveState();
    this._emit('chat-created', chat);
    this._emit('chat-switched', chat.id);
    return chat;
  }

  deleteChat(chatId) {
    delete this._state.chats[chatId];
    if (this._state.activeChat === chatId) {
      const remaining = this.getChatList();
      if (remaining.length > 0) {
        this._state.activeChat = remaining[0].id;
      } else {
        const chat = createChat();
        this._state.chats[chat.id] = chat;
        this._state.activeChat = chat.id;
      }
    }
    this._saveState();
    this._emit('chat-deleted', chatId);
    this._emit('chat-switched', this._state.activeChat);
  }

  addMessage(chatId, message) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    chat.messages.push(message);
    chat.updatedAt = Date.now();
    // Auto-title from first user message
    if (chat.title === 'New Chat' && message.role === 'user') {
      chat.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
    }
    this._saveState();
    this._emit('message-added', { chatId, message });
  }

  updateLastAssistantMessage(chatId, content, meta = {}) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    const lastMsg = [...chat.messages].reverse().find(m => m.role === 'assistant');
    if (lastMsg) {
      lastMsg.content = content;
      if (meta.tokens) lastMsg.tokens = meta.tokens;
      if (meta.cost !== undefined) lastMsg.cost = meta.cost;
      if (meta.latency !== undefined) lastMsg.latency = meta.latency;
      if (meta.thinking !== undefined) lastMsg.thinking = meta.thinking;
      chat.updatedAt = Date.now();
      this._saveState();
    }
  }

  removeLastMessage(chatId) {
    const chat = this._state.chats[chatId];
    if (!chat || chat.messages.length === 0) return null;
    const removed = chat.messages.pop();
    this._saveState();
    return removed;
  }

  clearChat(chatId) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    chat.messages = [];
    chat.tokenUsage = { prompt: 0, completion: 0, total: 0 };
    chat.totalCost = 0;
    chat.title = 'New Chat';
    chat.updatedAt = Date.now();
    this._saveState();
    this._emit('chat-cleared', chatId);
  }
}

export const state = new StateManager();
export { createId };
