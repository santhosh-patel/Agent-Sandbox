import { ragState } from '../rag/rag-state.js';
import { createEmbeddings } from '../rag/embeddings.js';
import { searchChunks } from '../rag/retriever.js';
import { showPrompt } from './modal.js';
import { showToast } from './toast.js';

function keywordHitScore(text, keywords) {
  if (!keywords?.trim()) return null;
  const words = keywords.toLowerCase().split(/[,;\s]+/).filter(Boolean);
  if (!words.length) return null;
  const hay = (text || '').toLowerCase();
  const hits = words.filter(w => hay.includes(w)).length;
  return Math.round((hits / words.length) * 100);
}

export class RagEvalUI {
  constructor(rootId = 'rag-eval-panel') {
    this.root = document.getElementById(rootId);
    this.running = false;
    ragState.on('eval-changed', () => this.render());
    ragState.on('collection-changed', () => this.render());
    this.render();
  }

  render() {
    if (!this.root) return;
    const collection = ragState.getActiveCollection();
    if (!collection) {
      this.root.innerHTML = '<p class="settings-hint">Select a collection</p>';
      return;
    }
    const evalSet = ragState.getEvalSet(collection.id);
    const runs = ragState.getEvalRuns(collection.id);

    this.root.innerHTML = `
      <div class="rag-eval-toolbar">
        <button type="button" class="btn-text btn-sm" id="rag-eval-add-q">+ Question</button>
        <button type="button" class="btn-text btn-sm" id="rag-eval-run" ${this.running ? 'disabled' : ''}>Run batch</button>
        <button type="button" class="btn-text btn-sm" id="rag-eval-export">Export</button>
      </div>
      <div class="rag-eval-questions">
        ${evalSet.questions.length ? evalSet.questions.map(q => `
          <div class="rag-eval-q" data-id="${q.id}">
            <div class="rag-eval-q-text">${escapeHtml(q.query)}</div>
            ${q.expectedKeywords ? `<div class="rag-eval-q-kw">Keywords: ${escapeHtml(q.expectedKeywords)}</div>` : ''}
            <button type="button" class="btn-text btn-sm rag-eval-del" data-id="${q.id}">Remove</button>
          </div>
        `).join('') : '<p class="settings-hint">Add test questions to evaluate retrieval.</p>'}
      </div>
      ${runs.length ? `<div class="rag-eval-runs"><div class="sidebar-section-label">Recent runs</div>${runs.slice(0, 3).map(r => `
        <div class="rag-eval-run">
          <div>${new Date(r.createdAt).toLocaleString()} — ${r.results.length} queries, avg score ${r.avgScore?.toFixed(3) || '—'}</div>
        </div>
      `).join('')}</div>` : ''}
      <div id="rag-eval-results"></div>
    `;

    this.root.querySelector('#rag-eval-add-q')?.addEventListener('click', () => this.addQuestion(collection.id));
    this.root.querySelector('#rag-eval-run')?.addEventListener('click', () => this.runBatch(collection.id));
    this.root.querySelector('#rag-eval-export')?.addEventListener('click', () => this.exportRuns(collection.id));
    this.root.querySelectorAll('.rag-eval-del').forEach(btn => {
      btn.addEventListener('click', () => ragState.removeEvalQuestion(collection.id, btn.dataset.id));
    });
  }

  async addQuestion(collectionId) {
    const query = await showPrompt({ title: 'Eval question', placeholder: 'What should retrieval find?' });
    if (!query?.trim()) return;
    const expectedKeywords = await showPrompt({ title: 'Expected keywords (optional)', placeholder: 'comma,separated', confirmText: 'Save', cancelText: 'Skip' });
    ragState.addEvalQuestion(collectionId, query.trim(), expectedKeywords?.trim() || '');
    showToast('Question added');
  }

  async runBatch(collectionId) {
    if (this.running) return;
    const evalSet = ragState.getEvalSet(collectionId);
    if (!evalSet.questions.length) {
      showToast('Add eval questions first', { isError: true });
      return;
    }
    const settings = ragState.settings;
    const key = ragState.getApiKey(settings.embeddingProvider);
    if (!key) {
      showToast('Add embedding API key', { isError: true });
      return;
    }

    this.running = true;
    this.render();
    const resultsEl = document.getElementById('rag-eval-results');
    if (resultsEl) resultsEl.innerHTML = '<p class="settings-hint">Running eval…</p>';

    const chunks = ragState.getAllChunks(collectionId);
    const results = [];
    let scoreSum = 0;

    try {
      for (const q of evalSet.questions) {
        const start = Date.now();
        const [queryEmbedding] = await createEmbeddings([q.query], settings, key);
        const retrieved = searchChunks(queryEmbedding, chunks, {
          topK: settings.topK,
          similarityThreshold: settings.similarityThreshold,
          searchStrategy: settings.searchStrategy,
        });
        const topScore = retrieved[0]?.score ?? 0;
        scoreSum += topScore;
        const contextText = retrieved.map(r => r.chunk.text).join(' ');
        const kwHit = keywordHitScore(contextText, q.expectedKeywords);
        results.push({
          query: q.query,
          chunksFound: retrieved.length,
          topScore,
          latency: parseFloat(((Date.now() - start) / 1000).toFixed(2)),
          keywordHitPct: kwHit,
          passed: retrieved.length > 0 && topScore >= settings.similarityThreshold,
        });
      }

      const run = {
        collectionId,
        config: {
          topK: settings.topK,
          similarityThreshold: settings.similarityThreshold,
          searchStrategy: settings.searchStrategy,
          chunkSize: settings.chunkSize,
        },
        results,
        avgScore: results.length ? scoreSum / results.length : 0,
      };
      ragState.addEvalRun(run);

      if (resultsEl) {
        resultsEl.innerHTML = `
          <table class="rag-eval-table">
            <thead><tr><th>Query</th><th>Chunks</th><th>Top score</th><th>Latency</th><th>KW%</th></tr></thead>
            <tbody>${results.map(r => `
              <tr class="${r.passed ? 'rag-eval-pass' : 'rag-eval-fail'}">
                <td>${escapeHtml(r.query.slice(0, 40))}${r.query.length > 40 ? '…' : ''}</td>
                <td>${r.chunksFound}</td>
                <td>${r.topScore.toFixed(3)}</td>
                <td>${r.latency}s</td>
                <td>${r.keywordHitPct != null ? r.keywordHitPct + '%' : '—'}</td>
              </tr>
            `).join('')}</tbody>
          </table>
        `;
      }
      showToast(`Eval complete — avg score ${run.avgScore.toFixed(3)}`);
    } catch (e) {
      showToast(e.message, { isError: true });
    } finally {
      this.running = false;
      this.render();
    }
  }

  exportRuns(collectionId) {
    const runs = ragState.getEvalRuns(collectionId);
    const evalSet = ragState.getEvalSet(collectionId);
    const blob = new Blob([JSON.stringify({ evalSet, runs, exportedAt: Date.now() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rag-eval-${collectionId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Eval exported');
  }
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
