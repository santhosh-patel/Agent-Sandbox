import { showToast } from './toast.js';
import { supportsVision } from '../providers/message-format.js';
import { state } from '../state.js';

const MAX_IMAGES = 4;
const MAX_SIZE = 4 * 1024 * 1024;

export class AttachmentManager {
  constructor() {
    this.images = [];
    this.previewEl = document.getElementById('attachment-preview');
    this.fileInput = document.getElementById('image-upload-input');
    this.attachBtn = document.getElementById('attach-image-btn');
    this.init();
  }

  init() {
    this.attachBtn?.addEventListener('click', () => this.fileInput?.click());
    this.fileInput?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach(f => this.addFile(f));
      e.target.value = '';
    });

    document.getElementById('message-input')?.addEventListener('paste', (e) => this.handlePaste(e));
  }

  handlePaste(e) {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(i => i.type.startsWith('image/'));
    if (!imageItems.length) return;
    e.preventDefault();
    imageItems.forEach(item => {
      const file = item.getAsFile();
      if (file) this.addFile(file);
    });
  }

  addFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Only images are supported', { isError: true });
      return;
    }
    if (file.size > MAX_SIZE) {
      showToast('Image must be under 4 MB', { isError: true });
      return;
    }
    if (this.images.length >= MAX_IMAGES) {
      showToast(`Maximum ${MAX_IMAGES} images`, { isError: true });
      return;
    }
    if (!supportsVision(state.settings.provider)) {
      showToast('Current provider may not support vision. Try OpenAI, Anthropic, or Gemini.', { isError: true });
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.images.push({ dataUrl: reader.result, mimeType: file.type, name: file.name });
      this.renderPreview();
    };
    reader.readAsDataURL(file);
  }

  renderPreview() {
    if (!this.previewEl) return;
    if (!this.images.length) {
      this.previewEl.hidden = true;
      this.previewEl.innerHTML = '';
      return;
    }
    this.previewEl.hidden = false;
    this.previewEl.innerHTML = this.images.map((img, i) => `
      <div class="attachment-thumb">
        <img src="${img.dataUrl}" alt="${img.name || 'Attachment'}" />
        <button type="button" class="attachment-remove" data-index="${i}" aria-label="Remove image">×</button>
      </div>
    `).join('');

    this.previewEl.querySelectorAll('.attachment-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.images.splice(parseInt(btn.dataset.index, 10), 1);
        this.renderPreview();
      });
    });
  }

  consume() {
    const imgs = this.images.slice();
    this.images = [];
    this.renderPreview();
    return imgs;
  }

  hasImages() {
    return this.images.length > 0;
  }

  clear() {
    this.images = [];
    this.renderPreview();
  }
}
