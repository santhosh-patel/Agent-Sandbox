import { state } from './state.js';
import { APP_NAME } from './shared/branding.js';

function escapeMd(text) {
  return String(text || '').replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1');
}

function roleLabel(role) {
  return role === 'user' ? 'You' : state.getAssistantName();
}

function chatToMarkdown(chat) {
  const lines = [`# ${chat.title || 'Chat'}`, '', `*Exported ${new Date().toLocaleString()}*`, ''];
  for (const msg of chat.messages) {
    if (msg.compareId) continue;
    const role = roleLabel(msg.role);
    lines.push(`## ${role}${msg.model ? ` (${msg.model})` : ''}`, '');
    if (msg.thinking) {
      lines.push('<details><summary>Reasoning</summary>', '', msg.thinking, '', '</details>', '');
    }
    if (msg.images?.length) {
      msg.images.forEach((img, i) => {
        lines.push(`![Image ${i + 1}](${img.dataUrl})`, '');
      });
    }
    lines.push(msg.content || '', '');
    if (msg.latency || msg.cost != null) {
      const meta = [];
      if (msg.latency) meta.push(`${msg.latency}s`);
      if (msg.cost != null) meta.push(`$${msg.cost.toFixed(5)}`);
      if (msg.tokens?.total_tokens) meta.push(`${msg.tokens.total_tokens} tokens`);
      lines.push(`*${meta.join(' · ')}*`, '');
    }
    lines.push('---', '');
  }
  return lines.join('\n');
}

export function downloadMarkdown(chat) {
  const md = chatToMarkdown(chat);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(chat.title || 'chat').replace(/[^\w\s-]/g, '').slice(0, 40)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

const SHARE_STYLES = `
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #111; background: #f8f9fa; }
  h1 { font-size: 1.5rem; margin-bottom: 4px; }
  .meta { color: #666; font-size: 0.85rem; margin-bottom: 24px; }
  .msg { margin-bottom: 20px; padding: 16px; border-radius: 12px; background: #fff; border: 1px solid #e5e7eb; }
  .msg.user { background: #ecfdf5; border-color: #a7f3d0; }
  .msg-role { font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 8px; }
  .msg img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
  .msg pre { background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 8px; overflow-x: auto; }
  .msg code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  .msg pre code { background: none; padding: 0; }
  .footer { margin-top: 32px; text-align: center; color: #9ca3af; font-size: 0.8rem; }
`;

function renderShareMessage(msg) {
  const role = roleLabel(msg.role);
  let imgs = '';
  if (msg.images?.length) {
    imgs = msg.images.map(img => `<img src="${img.dataUrl}" alt="Attached image" />`).join('');
  }
  const content = (msg.content || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
  return `<div class="msg ${msg.role}"><div class="msg-role">${role}${msg.model ? ` · ${msg.model}` : ''}</div>${imgs}<div>${content}</div></div>`;
}

function buildShareHtml(chat) {
  const messages = chat.messages.filter(m => !m.compareId);
  const body = messages.map(renderShareMessage).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(chat.title || 'Shared Chat')}</title>
  <style>${SHARE_STYLES}</style>
</head>
<body>
  <h1>${escapeHtml(chat.title || 'Shared Chat')}</h1>
  <p class="meta">Read-only export · ${new Date().toLocaleString()}</p>
  ${body}
  <p class="footer">Exported from ${APP_NAME}</p>
</body>
</html>`;
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function downloadShareHtml(chat) {
  const html = buildShareHtml(chat);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(chat.title || 'chat').replace(/[^\w\s-]/g, '').slice(0, 40)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildShareLink(chat) {
  const baseMessages = chat.messages.filter(m => !m.compareId).map(m => ({
    role: m.role,
    content: m.content,
    model: m.model,
    images: m.images?.map(img => ({ dataUrl: img.dataUrl })),
  }));
  let messages = baseMessages;
  let strippedImages = false;
  let payload = {
    title: chat.title,
    assistantName: state.getAssistantName(),
    messages,
    exportedAt: Date.now(),
  };
  let encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  let url = `${window.location.origin}/share.html#${encoded}`;
  if (url.length > 8000 && baseMessages.some(m => m.images?.length)) {
    strippedImages = true;
    messages = baseMessages.map(m => ({ role: m.role, content: m.content, model: m.model }));
    payload = { ...payload, messages };
    encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    url = `${window.location.origin}/share.html#${encoded}`;
  }
  if (url.length > 8000) return { url: null, tooLarge: true, strippedImages };
  return { url, tooLarge: false, strippedImages };
}

export function copyShareLink(chat) {
  const { url, tooLarge, strippedImages } = buildShareLink(chat);
  if (tooLarge || !url) {
    downloadShareHtml(chat);
    return { copied: false, downloaded: true, reason: 'too_large' };
  }
  navigator.clipboard.writeText(url);
  return { copied: true, downloaded: false, url, strippedImages };
}

function chatToCompareMarkdown(chat) {
  const lines = [`# ${chat.title || 'Chat'} — Model Comparison Matrix`, '', `*Exported ${new Date().toLocaleString()}*`, ''];

  const segments = [];
  let currentGroup = null;

  for (let i = 0; i < chat.messages.length; i++) {
    const msg = chat.messages[i];
    if (msg.compareId) {
      if (!currentGroup || currentGroup.compareId !== msg.compareId) {
        let userPrompt = '_(Prior Context)_';
        for (let j = segments.length - 1; j >= 0; j--) {
          if (segments[j].role === 'user' && !segments[j].compareId) {
            userPrompt = segments[j].content || '';
            segments.splice(j, 1);
            break;
          }
        }
        currentGroup = {
          compareId: msg.compareId,
          prompt: userPrompt,
          responses: []
        };
        segments.push(currentGroup);
      }
      currentGroup.responses.push(msg);
    } else {
      segments.push(msg);
      currentGroup = null;
    }
  }

  for (const seg of segments) {
    if (seg.compareId) {
      const models = seg.responses.map(r => r.compareModel || r.model || 'Model');
      
      lines.push('### Prompt', '', `> ${seg.prompt.replace(/\n/g, '\n> ')}`, '');
      
      lines.push('| ' + models.join(' | ') + ' |');
      lines.push('| ' + models.map(() => '---').join(' | ') + ' |');
      
      const formatCell = (text) => {
        return String(text || '')
          .replace(/\|/g, '\\|')
          .replace(/\n/g, '<br>');
      };
      
      const cells = seg.responses.map(r => formatCell(r.content));
      lines.push('| ' + cells.join(' | ') + ' |');
      
      const metaCells = seg.responses.map(r => {
        const parts = [];
        if (r.latency) parts.push(`${r.latency}s`);
        if (r.cost != null) parts.push(`$${r.cost.toFixed(5)}`);
        return parts.join(' · ') || '-';
      });
      lines.push('| ' + metaCells.map(m => `*${m}*`).join(' | ') + ' |');
      lines.push('');
    } else {
      const role = roleLabel(seg.role);
      lines.push(`## ${role}${seg.model ? ` (${seg.model})` : ''}`, '');
      if (seg.thinking) {
        lines.push('<details><summary>Reasoning</summary>', '', seg.thinking, '', '</details>', '');
      }
      lines.push(seg.content || '', '');
      lines.push('---', '');
    }
  }

  return lines.join('\n');
}

export function downloadCompareMarkdown(chat) {
  const md = chatToCompareMarkdown(chat);
  if (!md) return false;
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(chat.title || 'chat').replace(/[^\w\s-]/g, '').slice(0, 40)}-compare.md`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
