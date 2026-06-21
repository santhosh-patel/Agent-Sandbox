const PLAYGROUND_KEY = 'ai-playground-state';
const RAG_KEY = 'rag-sandbox-state';

export function loadPlaygroundUsage() {
  try {
    const raw = localStorage.getItem(PLAYGROUND_KEY);
    if (raw) return JSON.parse(raw).usage || null;
  } catch { /* ignore */ }
  return null;
}

export function loadRagUsage() {
  try {
    const raw = localStorage.getItem(RAG_KEY);
    if (raw) return JSON.parse(raw).usage || null;
  } catch { /* ignore */ }
  return null;
}

export function loadTopChats() {
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

export function renderChart(series, metric = 'cost') {
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

export function renderPlaygroundSection(pg) {
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

export function renderRagSection(rag) {
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

export function renderUsageDashboard(activeTab = 'all') {
  const pg = loadPlaygroundUsage() || { daily: {}, total: { requests: 0, tokens: 0, cost: 0 } };
  const rag = loadRagUsage() || { requests: 0, tokens: 0, cost: 0, latency: [] };

  if (activeTab === 'playground') return renderPlaygroundSection(pg);
  if (activeTab === 'rag') return renderRagSection(rag);
  return renderPlaygroundSection(pg) + renderRagSection(rag);
}

export function exportUsageJson() {
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

export function resetUsageStats(scope) {
  if (!scope) return { ok: false, reason: 'cancelled' };

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
    return { ok: true, scope };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
