export class InputUI {
  constructor(onSend, onStop) {
    this.textarea = document.getElementById('message-input');
    this.sendBtn = document.getElementById('send-btn');
    this.stopBtn = document.getElementById('stop-btn');
    this.charCount = document.getElementById('char-count');

    this.onSend = onSend;
    this.onStop = onStop;

    this.init();
  }

  init() {
    this.textarea.addEventListener('input', () => this.handleInput());
    this.textarea.addEventListener('keydown', (e) => this.handleKeyDown(e));
    
    this.sendBtn.addEventListener('click', () => this.triggerSend());
    this.stopBtn.addEventListener('click', () => {
      if (this.onStop) this.onStop();
    });

    this.handleInput();
  }

  handleInput() {
    // Auto resize textarea
    this.textarea.style.height = 'auto';
    this.textarea.style.height = `${this.textarea.scrollHeight}px`;

    const val = this.textarea.value.trim();
    this.sendBtn.disabled = !val;

    // Show/hide char count when getting long
    if (this.textarea.value.length > 500) {
      this.charCount.innerText = `${this.textarea.value.length} chars`;
    } else {
      this.charCount.innerText = '';
    }
  }

  handleKeyDown(e) {
    // Send on Enter, newline on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.triggerSend();
    }
  }

  triggerSend() {
    const val = this.textarea.value.trim();
    if (!val || this.sendBtn.disabled) return;

    if (this.onSend) {
      this.onSend(val);
    }

    this.textarea.value = '';
    this.handleInput();
  }

  setLoading(isLoading) {
    if (isLoading) {
      this.sendBtn.style.display = 'none';
      this.stopBtn.style.display = 'flex';
      this.textarea.disabled = true;
    } else {
      this.sendBtn.style.display = 'flex';
      this.stopBtn.style.display = 'none';
      this.textarea.disabled = false;
      this.textarea.focus();
      this.handleInput();
    }
  }

  focus() {
    this.textarea.focus();
  }
}
