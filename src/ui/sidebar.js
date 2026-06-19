import { state } from '../state.js';

export class SidebarUI {
  constructor() {
    this.chatListContainer = document.getElementById('chat-list');
    this.newChatBtn = document.getElementById('new-chat-btn');
    this.chatSearchInput = document.getElementById('chat-search');
    this.sidebar = document.getElementById('sidebar');
    this.sidebarOverlay = document.getElementById('sidebar-overlay');
    this.sidebarClose = document.getElementById('sidebar-close');

    this.init();
  }

  init() {
    this.newChatBtn.addEventListener('click', () => {
      state.createNewChat();
      this.closeMobileSidebar();
    });

    this.chatSearchInput.addEventListener('input', () => this.render());

    this.sidebarOverlay.addEventListener('click', () => this.closeMobileSidebar());
    if (this.sidebarClose) {
      this.sidebarClose.addEventListener('click', () => this.closeMobileSidebar());
    }

    // Subscribe to state updates
    state.on('chat-created', () => this.render());
    state.on('chat-deleted', () => this.render());
    state.on('chat-switched', () => this.render());
    state.on('message-added', () => this.render()); // To update dynamic title or order

    this.render();
  }

  openMobileSidebar() {
    this.sidebar.classList.add('open');
    this.sidebarOverlay.classList.add('visible');
  }

  closeMobileSidebar() {
    this.sidebar.classList.remove('open');
    this.sidebarOverlay.classList.remove('visible');
  }

  render() {
    const activeChatId = state.activeChat;
    const query = this.chatSearchInput.value.toLowerCase().trim();
    const chats = state.getChatList();

    this.chatListContainer.innerHTML = '';

    const filteredChats = chats.filter(chat => {
      return chat.title.toLowerCase().includes(query) ||
        chat.messages.some(m => m.content.toLowerCase().includes(query));
    });

    if (filteredChats.length === 0) {
      this.chatListContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-tertiary); font-size: 0.8rem;">
          No chats found
        </div>
      `;
      return;
    }

    filteredChats.forEach(chat => {
      const item = document.createElement('div');
      item.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}`;
      item.setAttribute('data-id', chat.id);

      item.innerHTML = `
        <svg class="chat-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="chat-item-text">${this.escapeHtml(chat.title)}</span>
        <button class="chat-item-delete" aria-label="Delete chat" title="Delete chat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;

      item.addEventListener('click', (e) => {
        // Prevent click if clicking delete button
        if (e.target.closest('.chat-item-delete')) return;
        state.setActiveChat(chat.id);
        this.closeMobileSidebar();
      });

      const deleteBtn = item.querySelector('.chat-item-delete');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this conversation?')) {
          state.deleteChat(chat.id);
        }
      });

      this.chatListContainer.appendChild(item);
    });
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  exportChats() {
    const dataStr = state.exportAll();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `ai-playground-chats-${new Date().toISOString().slice(0,10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    this.showToast('Chats exported successfully');
  }

  handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const success = state.importChats(event.target.result);
      if (success) {
        this.showToast('Conversations imported successfully');
      } else {
        this.showToast('Failed to import conversations. Check file format.', true);
      }
      this.importFile.value = ''; // Reset input
    };
    reader.readAsText(file);
  }

  showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast visible';
    if (isError) toast.style.borderColor = 'var(--error)';
    toast.innerText = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}
