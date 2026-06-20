import { state } from '../state.js';
import { showConfirm, showPrompt } from './modal.js';
import { isMobile, onViewportChange, closeSettingsPanel } from './breakpoints.js';
import { downloadMarkdown, copyShareLink, downloadShareHtml } from '../export.js';
import { showToast } from './toast.js';
import { PROVIDERS } from '../providers/registry.js';
import { openUsageWindow } from './help-base.js';

export class SidebarUI {
  constructor() {
    this.chatListContainer = document.getElementById('chat-list');
    this.newChatBtn = document.getElementById('new-chat-btn');
    this.chatSearchInput = document.getElementById('chat-search');
    this.sidebar = document.getElementById('sidebar');
    this.sidebarOverlay = document.getElementById('sidebar-overlay');
    this.edgeToggle = document.getElementById('sidebar-edge-toggle');
    this.collapseBtn = document.getElementById('sidebar-collapse-btn');
    this.menuBtn = document.getElementById('topnav-menu-btn');
    this.filterTabs = document.getElementById('sidebar-filters');
    this.folderTabs = document.getElementById('sidebar-folder-tabs');
    this.newFolderBtn = document.getElementById('new-folder-btn');
    this.searchScope = 'full';

    this.init();
  }

  init() {
    this.newChatBtn.addEventListener('click', () => {
      state.createNewChat();
      this.closeMobileSidebar();
    });

    this.chatSearchInput.addEventListener('input', () => this.render());

    document.getElementById('search-scope-btn')?.addEventListener('click', () => {
      this.searchScope = this.searchScope === 'full' ? 'title' : 'full';
      const btn = document.getElementById('search-scope-btn');
      if (btn) btn.textContent = this.searchScope === 'full' ? 'All' : 'Title';
      this.render();
    });

    this.sidebarOverlay.addEventListener('click', () => this.closeMobileSidebar());
    if (this.edgeToggle) {
      this.edgeToggle.addEventListener('click', () => this.toggleSidebar());
    }
    if (this.collapseBtn) {
      this.collapseBtn.addEventListener('click', () => {
        if (!this.isMobile()) this.setCollapsed(true);
      });
    }
    if (this.menuBtn) {
      this.menuBtn.addEventListener('click', () => this.toggleSidebar());
    }

    this.filterTabs?.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.setSidebarFilter(btn.dataset.filter);
        this.filterTabs.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === btn));
        this.folderTabs?.querySelectorAll('[data-folder]').forEach(b => b.classList.remove('active'));
        this.render();
      });
    });

    this.newFolderBtn?.addEventListener('click', () => this.handleNewFolder());
    document.getElementById('sidebar-usage-btn')?.addEventListener('click', () => openUsageWindow());

    this.renderFolderTabs();

    const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    this.setCollapsed(collapsed);

    onViewportChange(({ mobile }) => {
      if (!mobile) this.closeMobileSidebar();
    });

    state.on('chat-created', () => this.render());
    state.on('chat-deleted', () => this.render());
    state.on('chat-switched', () => this.render());
    state.on('chat-renamed', () => this.render());
    state.on('chat-updated', () => this.render());
    state.on('message-added', () => this.render());
    state.on('chats-imported', () => this.render());
    state.on('data-cleared', () => this.render());
    state.on('sidebar-filter-changed', () => this.render());
    state.on('folders-changed', () => {
      this.renderFolderTabs();
      this.render();
    });

    this.render();
  }

  async handleNewFolder() {
    const name = await showPrompt({ title: 'New folder', defaultValue: 'New Folder' });
    if (name?.trim()) {
      const folder = state.createFolder(name.trim());
      state.setSidebarFilter(folder.id);
      this.renderFolderTabs();
      this.render();
    }
  }

  renderFolderTabs() {
    if (!this.folderTabs) return;
    const filter = state.sidebarFilter;
    this.folderTabs.innerHTML = state.folders.map(f => `
      <button type="button" class="filter-tab folder-tab ${filter === f.id ? 'active' : ''}" data-folder="${f.id}">
        ${this.escapeHtml(f.name)}
      </button>
    `).join('');

    this.folderTabs.querySelectorAll('[data-folder]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.setSidebarFilter(btn.dataset.folder);
        this.filterTabs?.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        this.folderTabs.querySelectorAll('[data-folder]').forEach(b => b.classList.toggle('active', b === btn));
        this.render();
      });
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showFolderMenu(btn.dataset.folder, btn);
      });
    });
  }

  async showFolderMenu(folderId, anchor) {
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return;
    const existing = document.querySelector('.folder-context-menu');
    existing?.remove();
    const menu = document.createElement('div');
    menu.className = 'chat-context-menu folder-context-menu';
    menu.innerHTML = `
      <button type="button" data-action="rename">Rename</button>
      <button type="button" data-action="delete">Delete</button>
    `;
    document.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`;
    const close = () => menu.remove();
    setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
    menu.querySelector('[data-action="rename"]')?.addEventListener('click', async () => {
      const name = await showPrompt({ title: 'Rename folder', defaultValue: folder.name });
      if (name?.trim()) state.renameFolder(folderId, name.trim());
      close();
    });
    menu.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
      const ok = await showConfirm({ title: 'Delete folder', message: 'Chats will be moved out of this folder.', confirmText: 'Delete', destructive: true });
      if (ok) {
        state.deleteFolder(folderId);
        if (state.sidebarFilter === folderId) state.setSidebarFilter('all');
      }
      close();
    });
  }

  openMobileSidebar() {
    closeSettingsPanel();
    this.sidebar.classList.add('open');
    this.sidebarOverlay.classList.add('visible');
    document.body.classList.add('sidebar-open');
    this.updateTopnavState();
  }

  closeMobileSidebar() {
    this.sidebar.classList.remove('open');
    this.sidebarOverlay.classList.remove('visible');
    document.body.classList.remove('sidebar-open');
    this.updateTopnavState();
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
    const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
    if (this.edgeToggle) {
      this.edgeToggle.setAttribute('aria-expanded', String(!collapsed));
      this.edgeToggle.setAttribute('aria-label', label);
      this.edgeToggle.title = label;
    }
    if (this.collapseBtn) {
      this.collapseBtn.setAttribute('aria-label', label);
      this.collapseBtn.title = label;
    }
    localStorage.setItem('sidebar-collapsed', collapsed);
    this.updateTopnavState();
  }

  updateTopnavState() {
    const sidebarOpen = this.isMobile()
      ? this.sidebar.classList.contains('open')
      : !this.sidebar.classList.contains('collapsed');
    this.menuBtn?.classList.toggle('topnav-pill--active', sidebarOpen);
  }

  render() {
    const activeChatId = state.activeChat;
    const query = this.chatSearchInput.value.toLowerCase().trim();
    const filter = state.sidebarFilter;
    let chats = state.getChatList({ includeArchived: filter === 'archived' });

    if (filter === 'pinned') chats = chats.filter(c => c.pinned);
    else if (filter === 'archived') chats = chats.filter(c => c.archived);
    else if (filter !== 'all') chats = chats.filter(c => c.folderId === filter);

    this.chatListContainer.innerHTML = '';

    const filteredChats = chats.filter(chat => {
      if (!query) return true;
      if (this.searchScope === 'title') {
        return chat.title.toLowerCase().includes(query);
      }
      return chat.title.toLowerCase().includes(query) ||
        chat.messages.some(m => m.content?.toLowerCase().includes(query));
    });

    if (filteredChats.length === 0) {
      const emptyMsg = query
        ? 'No chats match your search'
        : filter === 'pinned' ? 'No pinned chats'
        : filter === 'archived' ? 'No archived chats'
        : filter !== 'all' ? 'This folder is empty'
        : 'No chats yet — start a conversation!';
      this.chatListContainer.innerHTML = `
        <div class="empty-state">
          <p>${emptyMsg}</p>
          ${!query && filter === 'all' ? '<button type="button" class="btn btn-primary btn-sm empty-new-chat">New chat</button>' : ''}
        </div>
      `;
      this.chatListContainer.querySelector('.empty-new-chat')?.addEventListener('click', () => state.createNewChat());
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
        item.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}${chat.pinned ? ' pinned' : ''}`;
        item.setAttribute('data-id', chat.id);

        const msgCount = chat.messages.length;
        const meta = `${state.settings.model || 'No model'}, ${msgCount} msg${msgCount !== 1 ? 's' : ''}`;
        const snippet = this.getSearchSnippet(chat, query);
        const pinIcon = chat.pinned ? '<span class="chat-pin-icon" aria-hidden="true">📌</span>' : '';

        item.innerHTML = `
          <div class="chat-item-content">
            <span class="chat-item-text">${pinIcon}${this.highlightMatch(this.escapeHtml(chat.title), query)}</span>
            <span class="chat-item-meta">${snippet || meta}</span>
          </div>
          <div class="chat-item-actions">
            <button type="button" class="chat-item-menu-btn" aria-label="Chat options">⋯</button>
            <button type="button" class="chat-item-delete" aria-label="Delete">Delete</button>
          </div>
        `;

        item.addEventListener('click', (e) => {
          if (e.target.closest('.chat-item-delete') || e.target.closest('.chat-item-menu-btn')) return;
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

        item.querySelector('.chat-item-menu-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showChatMenu(chat, e.currentTarget);
        });

        this.chatListContainer.appendChild(item);
      });
    });
  }

  async showChatMenu(chat, anchor) {
    const existing = document.querySelector('.chat-context-menu');
    existing?.remove();

    const menu = document.createElement('div');
    menu.className = 'chat-context-menu';
    const folderOptions = state.folders.map(f =>
      `<button type="button" data-action="folder" data-folder="${f.id}">${this.escapeHtml(f.name)}</button>`
    ).join('');

    const meta = this.getChatMenuMeta(chat);
    const metaLine = [meta.provider, meta.model, meta.cost].filter(Boolean).join(' · ');
    const hasMessages = chat.messages.length > 0;
    const exportSection = hasMessages ? `
      <div class="chat-menu-divider"></div>
      <div class="chat-menu-label">Export</div>
      <button type="button" data-action="export-md">Export Markdown</button>
      <button type="button" data-action="export-share">Copy share link</button>
      <button type="button" data-action="export-html">Download HTML</button>
    ` : '';

    menu.innerHTML = `
      <div class="chat-menu-header">
        <div class="chat-menu-title">${this.escapeHtml(chat.title)}</div>
        ${metaLine ? `<div class="chat-menu-meta">${this.escapeHtml(metaLine)}</div>` : ''}
      </div>
      <div class="chat-menu-divider"></div>
      <button type="button" data-action="pin">${chat.pinned ? 'Unpin' : 'Pin'}</button>
      <button type="button" data-action="archive">${chat.archived ? 'Unarchive' : 'Archive'}</button>
      <button type="button" data-action="duplicate">Duplicate</button>
      <button type="button" data-action="rename">Rename</button>
      ${state.folders.length ? `<div class="chat-menu-divider"></div><div class="chat-menu-label">Move to folder</div>${folderOptions}` : ''}
      ${state.folders.length ? `<button type="button" data-action="folder" data-folder="">No folder</button>` : ''}
      ${exportSection}
    `;

    document.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${Math.min(rect.left, window.innerWidth - Math.max(menu.offsetWidth, 220))}px`;

    const close = () => menu.remove();
    setTimeout(() => document.addEventListener('click', close, { once: true }), 0);

    menu.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'pin') state.pinChat(chat.id, !chat.pinned);
        else if (action === 'archive') {
          state.archiveChat(chat.id, !chat.archived);
          if (!chat.archived) state.setSidebarFilter('archived');
        }
        else if (action === 'duplicate') state.duplicateChat(chat.id);
        else if (action === 'rename') {
          const title = await showPrompt({ title: 'Rename chat', defaultValue: chat.title });
          if (title?.trim()) state.renameChat(chat.id, title.trim());
        }
        else if (action === 'folder') state.moveChatToFolder(chat.id, btn.dataset.folder);
        else if (action === 'export-md') {
          downloadMarkdown(chat);
          showToast('Markdown exported');
        }
        else if (action === 'export-share') {
          const result = copyShareLink(chat);
          if (result.copied) showToast('Share link copied');
          else if (result.downloaded) showToast('Chat too large for link — HTML downloaded');
        }
        else if (action === 'export-html') {
          downloadShareHtml(chat);
          showToast('HTML export downloaded');
        }
        close();
      });
    });
  }

  getChatMenuMeta(chat) {
    const costTotal = state.getSessionCost(chat.id);
    const cost = costTotal > 0 ? `$${costTotal.toFixed(4)}` : '';
    const lastModel = [...chat.messages].reverse().find(m => m.model)?.model;
    const isActive = chat.id === state.activeChat;
    const settings = state.settings;
    const provider = isActive && settings.provider
      ? (PROVIDERS[settings.provider]?.name || settings.provider)
      : '';
    const model = lastModel || (isActive ? settings.model : '') || '';
    return { provider, model, cost };
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
    const match = chat.messages.find(m => m.content?.toLowerCase().includes(query));
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

export function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('visible');
}
