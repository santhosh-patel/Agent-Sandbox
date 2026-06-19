import { marked } from 'marked';
import hljs from 'highlight.js';

let currentTheme = 'light';

export function setMarkdownTheme(theme) {
  currentTheme = theme === 'dark' ? 'dark' : 'light';
  updateHighlightStylesheet();
}

function updateHighlightStylesheet() {
  let link = document.getElementById('hljs-theme');
  if (!link) {
    link = document.createElement('link');
    link.id = 'hljs-theme';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = currentTheme === 'dark'
    ? 'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css'
    : 'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css';
}

updateHighlightStylesheet();

const renderer = new marked.Renderer();

renderer.code = function(code, infostring) {
  const lang = (infostring || '').match(/\S*/)[0] || 'text';
  const highlighted = lang && hljs.getLanguage(lang)
    ? hljs.highlight(code, { language: lang }).value
    : escapeHtml(code);

  return `
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-lang">${lang}</span>
        <button class="code-copy-btn" onclick="window.copyCodeBlock(this)" data-code="${encodeURIComponent(code)}">Copy</button>
      </div>
      <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
    </div>
  `;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
});

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.copyCodeBlock = function(button) {
  const code = decodeURIComponent(button.getAttribute('data-code'));
  navigator.clipboard.writeText(code).then(() => {
    const original = button.textContent;
    button.textContent = 'Copied';
    button.style.color = 'var(--success)';
    setTimeout(() => {
      button.textContent = original;
      button.style.color = '';
    }, 2000);
  }).catch(err => console.error('Failed to copy:', err));
};

export function renderMarkdown(text) {
  if (!text) return '';
  return marked.parse(text);
}
