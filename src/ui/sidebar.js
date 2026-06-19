import { state } from '../state.js';
import { showConfirm } from './modal.js';
import { isMobile, onViewportChange, closeSettingsPanel } from './breakpoints.js';

export class SidebarUI {
  constructor() {
    this.chatListContainer = document.getElementById('chat-list');
    this.newChatBtn = document.getElementById('new-chat-btn');
    this.chatSearchInput = document.getElementById('chat-search');
    this.sidebar = document.getElementById('sidebar');
    this.sidebarOverlay = document.getElementById('sidebar-overlay');
    this.edgeToggle = document.getElementById('sidebar-edge-toggle');
    this.resetLayoutBtn = document.getElementById('reset-layout-btn');

    this.init();
  }

  init() {
    this.newChatBtn.addEventListener('click', () => {
      state.createNewChat();
      this.closeMobileSidebar();
    });

    this.chatSearchInput.addEventListener('input', () => this.render());

    this.sidebarOverlay.addEventListener('click', () => this.closeMobileSidebar());
    if (this.edgeToggle) {
      this.edgeToggle.addEventListener('click', () => this.toggleSidebar());
    }

    if (this.resetLayoutBtn) {
      this.resetLayoutBtn.addEventListener('click', () => this.resetLayout());
    }

    const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    this.setCollapsed(collapsed);

    onViewportChange(({ mobile }) => {
      if (!mobile) this.closeMobileSidebar();
    });

    state.on('chat-created', () => this.render());
    state.on('chat-deleted', () => this.render());
    state.on('chat-switched', () => this.render());
    state.on('chat-renamed', () => this.render());
    state.on('message-added', () => this.render());
    state.on('chats-imported', () => this.render());
    state.on('data-cleared', () => this.render());

    this.render();
  }

  resetLayout() {
    localStorage.setItem('sidebar-collapsed', 'false');
    localStorage.setItem('settings-collapsed', 'false');
    this.setCollapsed(false);
    document.body.classList.remove('settings-collapsed');
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) settingsPanel.classList.remove('collapsed');
    const edgeRight = document.getElementById('settings-edge-toggle');
    if (edgeRight) edgeRight.setAttribute('aria-expanded', 'true');
  }

  openMobileSidebar() {
    closeSettingsPanel();
    this.sidebar.classList.add('open');
    this.sidebarOverlay.classList.add('visible');
  }

  closeMobileSidebar() {
    this.sidebar.classList.remove('open');
    this.sidebarOverlay.classList.remove('visible');
  }

  isMobile() {
    return isMobile();
  }

  toggleSidebar() {
    if (this.isMobile()) {
      if (this.sidebar.classList.contains('open')) {
        this.closeMobileSidebar();
      } else {
        this.openMobileSidebar();
      }
    } else {
      this.setCollapsed(!this.sidebar.classList.contains('collapsed'));
    }
  }

  expandSidebar() {
    if (this.isMobile()) this.openMobileSidebar();
    else this.setCollapsed(false);
  }

  setCollapsed(collapsed) {
    this.sidebar.classList.toggle('collapsed', collapsed);
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    if (this.edgeToggle) {
      this.edgeToggle.setAttribute('aria-expanded', String(!collapsed));
    }
    localStorage.setItem('sidebar-collapsed', collapsed);
  }

  render() {
    const activeChatId = state.activeChat;
    const query = this.chatSearchInput.value.toLowerCase().trim();
    const chats = state.getChatList();
    const settings = state.settings;

    this.chatListContainer.innerHTML = '';

    const filteredChats = chats.filter(chat => {
      if (!query) return true;
      return chat.title.toLowerCase().includes(query) ||
        chat.messages.some(m => m.content.toLowerCase().includes(query));
    });

    if (filteredChats.length === 0) {
      this.chatListContainer.innerHTML = `
        <div class="empty-state">
          <p>No chats found</p>
        </div>
      `;
      return;
    }

    const groups = this.groupChatsByDate(filteredChats);

    groups.forEach(group => {
      const label = document.createElement('div');
      label.className = 'chat-group-label';
      label.textContent = group.label;
      this.chatListContainer.appendChild(label);

      group.chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}`;
        item.setAttribute('data-id', chat.id);

        const msgCount = chat.messages.length;
        const meta = `${settings.model || 'No model'} · ${msgCount} msg${msgCount !== 1 ? 's' : ''}`;
        const snippet = this.getSearchSnippet(chat, query);

        item.innerHTML = `
          <div class="chat-item-content">
            <span class="chat-item-text">${this.highlightMatch(this.escapeHtml(chat.title), query)}</span>
            <span class="chat-item-meta">${snippet || meta}</span>
          </div>
          <button type="button" class="chat-item-delete" aria-label="Delete">Delete</button>
        `;

        item.addEventListener('click', (e) => {
          if (e.target.closest('.chat-item-delete')) return;
          state.setActiveChat(chat.id);
          this.closeMobileSidebar();
        });

        item.querySelector('.chat-item-delete').addEventListener('click', async (e) => {
          e.stopPropagation();
          const ok = await showConfirm({
            title: 'Delete chat',
            message: 'Delete this conversation permanently?',
            confirmText: 'Delete',
            destructive: true,
          });
          if (ok) state.deleteChat(chat.id);
        });

        this.chatListContainer.appendChild(item);
      });
    });
  }

  groupChatsByDate(chats) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = { Today: [], Yesterday: [], Older: [] };
    chats.forEach(chat => {
      const d = new Date(chat.updatedAt);
      const chatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (chatDay >= today) groups.Today.push(chat);
      else if (chatDay >= yesterday) groups.Yesterday.push(chat);
      else groups.Older.push(chat);
    });

    return Object.entries(groups)
      .filter(([, list]) => list.length > 0)
      .map(([label, list]) => ({ label, chats: list }));
  }

  getSearchSnippet(chat, query) {
    if (!query) return '';
    const match = chat.messages.find(m => m.content.toLowerCase().includes(query));
    if (!match) return '';
    const idx = match.content.toLowerCase().indexOf(query);
    const start = Math.max(0, idx - 20);
    const snippet = match.content.slice(start, start + 60);
    return this.highlightMatch(this.escapeHtml(snippet), query);
  }

  highlightMatch(text, query) {
    if (!query) return text;
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(re, '<mark>$1</mark>');
  }

  escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
