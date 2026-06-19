import { marked } from 'marked';
import hljs from 'highlight.js';
// We'll import a standard style from highlight.js
import 'highlight.js/styles/github-dark.css';

// Configure marked with highlight.js
const renderer = new marked.Renderer();

// Custom code block renderer to add Copy button and Language badge
renderer.code = function(code, infostring, escaped) {
  const lang = (infostring || '').match(/\S*/)[0] || 'text';
  const highlighted = lang && hljs.getLanguage(lang)
    ? hljs.highlight(code, { language: lang }).value
    : escapeHtml(code);

  const escapedCode = escapeHtml(code);

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
  renderer: renderer,
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false
});

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Global copy helper for buttons within marked-generated html
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
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
};

export function renderMarkdown(text) {
  if (!text) return '';
  return marked.parse(text);
}
