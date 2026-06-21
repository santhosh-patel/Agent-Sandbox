const PLAYGROUND_KEY = 'ai-playground-state';
const RAG_KEY = 'rag-sandbox-state';

let activeTab = 'all';

function loadPlaygroundUsage() {
  try {
    const raw = localStorage.getItem(PLAYGROUND_KEY);
    if (raw) return JSON.parse(raw).usage || null;
  } catch { /* ignore */ }
  return null;
}

function loadRagUsage() {
  try {
    const raw = localStorage.getItem(RAG_KEY);
    if (raw) return JSON.parse(raw).usage || null;
  } catch { /* ignore */ }
  return null;
}

function loadTopChats() {
  try {
    const raw = localStorage.getItem(PLAYGROUND_KEY);
    if (!raw) return [];
    const { chats } = JSON.parse(raw);
    return Object.values(chats || {})
      .map(c => ({ title: c.title, cost: c.totalCost || 0, messages: c.messages?.length || 0 }))
      .filter(c => c.cost > 0)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  } catch {
    return [];
  }
}

function sumLastDays(daily, days) {
  const result = { requests: 0, tokens: 0, cost: 0 };
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const day = daily[key];
    if (day) {
      result.requests += day.requests || 0;
      result.tokens += day.tokens || 0;
      result.cost += day.cost || 0;
    }
  }
  return result;
}

function last7DaySeries(daily) {
  const series = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const day = daily[key] || { requests: 0, tokens: 0, cost: 0 };
    series.push({
      key,
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      ...day,
    });
  }
  return series;
}

function renderProviderRows(byProvider) {
  if (!byProvider || !Object.keys(byProvider).length) {
    return '<p class="usage-empty">No provider breakdown yet.</p>';
  }
  return Object.entries(byProvider).map(([name, stats]) => `
    <div class="usage-row">
      <span>${name}</span>
      <span>${stats.requests} req</span>
      <span>${(stats.tokens || 0).toLocaleString()} tok</span>
      <span>$${(stats.cost || 0).toFixed(4)}</span>
    </div>
  `).join('');
}

function renderChart(series, metric = 'cost') {
  const max = Math.max(...series.map(d => d[metric] || 0), 0.0001);
  return `
    <div class="usage-chart" role="img" aria-label="7-day ${metric} chart">
      ${series.map(d => {
        const val = d[metric] || 0;
        const pct = Math.round((val / max) * 100);
        const title = metric === 'cost' ? `$${val.toFixed(4)}` : val.toLocaleString();
        return `<div class="usage-chart-bar" title="${d.label}: ${title}" style="--h:${pct}%"><span>${d.label.slice(0, 1)}</span></div>`;
      }).join('')}
    </div>
  `;
}

function renderPlaygroundSection(pg) {
  const today = new Date().toISOString().slice(0, 10);
  const todayStats = pg.daily[today] || { requests: 0, tokens: 0, cost: 0, byProvider: {} };
  const weekStats = sumLastDays(pg.daily, 7);
  const series = last7DaySeries(pg.daily);
  const topChats = loadTopChats();

  return `
    <section class="usage-stats">
      <h2>AI Playground</h2>
      <div class="usage-row usage-row--header"><span>Period</span><span>Requests</span><span>Tokens</span><span>Cost</span></div>
      <div class="usage-row"><span>Today</span><span>${todayStats.requests}</span><span>${todayStats.tokens.toLocaleString()}</span><span>$${todayStats.cost.toFixed(4)}</span></div>
      <div class="usage-row"><span>7 days</span><span>${weekStats.requests}</span><span>${weekStats.tokens.toLocaleString()}</span><span>$${weekStats.cost.toFixed(4)}</span></div>
      <div class="usage-row"><span>All time</span><span>${pg.total.requests}</span><span>${pg.total.tokens.toLocaleString()}</span><span>$${pg.total.cost.toFixed(4)}</span></div>
      <h3>Last 7 days (cost)</h3>
      ${renderChart(series, 'cost')}
      <h3>By provider (today)</h3>
      ${renderProviderRows(todayStats.byProvider)}
      <h3>Top chats by cost</h3>
      ${topChats.length ? topChats.map(c => `
        <div class="usage-row">
          <span>${c.title}</span>
          <span>${c.messages} msgs</span>
          <span></span>
          <span>$${c.cost.toFixed(4)}</span>
        </div>
      `).join('') : '<p class="usage-empty">No chat costs recorded yet.</p>'}
    </section>
  `;
}

function renderRagSection(rag) {
  const avgLatency = rag.latency?.length
    ? (rag.latency.reduce((a, b) => a + b, 0) / rag.latency.length).toFixed(2)
    : '—';

  return `
    <section class="usage-stats">
      <h2>RAG Sandbox</h2>
      <div class="usage-row usage-row--header"><span>Metric</span><span>Value</span><span></span><span></span></div>
      <div class="usage-row"><span>Requests</span><span>${rag.requests}</span><span></span><span></span></div>
      <div class="usage-row"><span>Tokens</span><span>${(rag.tokens || 0).toLocaleString()}</span><span></span><span></span></div>
      <div class="usage-row"><span>Cost (est.)</span><span>$${(rag.cost || 0).toFixed(4)}</span><span></span><span></span></div>
      <div class="usage-row"><span>Avg latency</span><span>${avgLatency}s</span><span></span><span></span></div>
      <p class="settings-hint">RAG tracks embedding + chat usage for the active browser session.</p>
    </section>
  `;
}

function render() {
  const el = document.getElementById('usage-dashboard');
  if (!el) return;

  const pg = loadPlaygroundUsage() || { daily: {}, total: { requests: 0, tokens: 0, cost: 0 } };
  const rag = loadRagUsage() || { requests: 0, tokens: 0, cost: 0, latency: [] };

  if (activeTab === 'playground') {
    el.innerHTML = renderPlaygroundSection(pg);
  } else if (activeTab === 'rag') {
    el.innerHTML = renderRagSection(rag);
  } else {
    el.innerHTML = renderPlaygroundSection(pg) + renderRagSection(rag);
  }
}

function exportJson() {
  const data = {
    exportedAt: Date.now(),
    playground: loadPlaygroundUsage(),
    rag: loadRagUsage(),
    topChats: loadTopChats(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `usage-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function resetStats() {
  const scope = await showResetDialog();
  if (!scope) return;

  try {
    if (scope === 'all' || scope === 'playground') {
      const pgRaw = localStorage.getItem(PLAYGROUND_KEY);
      if (pgRaw) {
        const pg = JSON.parse(pgRaw);
        pg.usage = { daily: {}, total: { requests: 0, tokens: 0, cost: 0 } };
        Object.values(pg.chats || {}).forEach(c => {
          c.totalCost = 0;
          c.tokenUsage = { prompt: 0, completion: 0, total: 0 };
        });
        localStorage.setItem(PLAYGROUND_KEY, JSON.stringify(pg));
      }
    }
    if (scope === 'all' || scope === 'rag') {
      const ragRaw = localStorage.getItem(RAG_KEY);
      if (ragRaw) {
        const rag = JSON.parse(ragRaw);
        rag.usage = { tokens: 0, cost: 0, requests: 0, latency: [] };
        localStorage.setItem(RAG_KEY, JSON.stringify(rag));
      }
    }
    render();
  } catch (e) {
    alert('Reset failed: ' + e.message);
  }
}

function showResetDialog() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay visible';
    overlay.innerHTML = `
      <div class="modal" role="dialog">
        <h3 class="modal-title">Reset usage statistics</h3>
        <p class="modal-message">Choose which stats to clear. This cannot be undone.</p>
        <div class="modal-actions modal-actions--stack">
          <button type="button" class="btn btn-danger" data-scope="all">Reset all</button>
          <button type="button" class="btn btn-ghost" data-scope="playground">Playground only</button>
          <button type="button" class="btn btn-ghost" data-scope="rag">RAG only</button>
          <button type="button" class="btn btn-ghost modal-cancel">Cancel</button>
        </div>
      </div>
    `;
    const close = (val) => {
      overlay.remove();
      resolve(val);
    };
    overlay.querySelector('.modal-cancel')?.addEventListener('click', () => close(null));
    overlay.querySelectorAll('[data-scope]').forEach(btn => {
      btn.addEventListener('click', () => close(btn.dataset.scope));
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    document.body.appendChild(overlay);
  });
}

document.getElementById('usage-tabs')?.addEventListener('click', (e) => {
  const tab = e.target.closest('.usage-tab');
  if (!tab) return;
  activeTab = tab.dataset.tab || 'all';
  document.querySelectorAll('.usage-tab').forEach(t => {
    t.classList.toggle('usage-tab--active', t === tab);
  });
  render();
});

document.getElementById('usage-refresh-btn')?.addEventListener('click', render);
document.getElementById('usage-export-btn')?.addEventListener('click', exportJson);
document.getElementById('usage-reset-btn')?.addEventListener('click', resetStats);
window.addEventListener('storage', render);
render();

try {
  const raw = localStorage.getItem(PLAYGROUND_KEY);
  if (raw) {
    const theme = JSON.parse(raw).settings?.theme || 'light';
    let active = theme;
    if (theme === 'system') {
      active = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', active);
  }
} catch { /* ignore */ }
