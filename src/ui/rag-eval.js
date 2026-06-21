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

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export class RagEvalUI {
  constructor(rootId = 'rag-eval-panel') {
    this.root = document.getElementById(rootId);
    this.running = false;
    this.lastRun = null;
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
        <button type="button" class="btn-text btn-sm" id="rag-eval-import">Import</button>
        <button type="button" class="btn-text btn-sm" id="rag-eval-run" ${this.running ? 'disabled' : ''}>Run batch</button>
        <button type="button" class="btn-text btn-sm" id="rag-eval-export">JSON</button>
        <button type="button" class="btn-text btn-sm" id="rag-eval-export-md">Report</button>
      </div>
      <div class="rag-eval-questions">
        ${evalSet.questions.length ? evalSet.questions.map(q => `
          <div class="rag-eval-q" data-id="${q.id}">
            <div class="rag-eval-q-text">${escapeHtml(q.query)}</div>
            ${q.expectedKeywords ? `<div class="rag-eval-q-kw">Keywords: ${escapeHtml(q.expectedKeywords)}</div>` : ''}
            <button type="button" class="btn-text btn-sm rag-eval-del" data-id="${q.id}">Remove</button>
          </div>
        `).join('') : '<p class="settings-hint">Add test questions to evaluate retrieval quality.</p>'}
      </div>
      ${runs.length ? `<div class="rag-eval-runs"><div class="sidebar-section-label">Recent runs</div>${runs.slice(0, 3).map(r => `
        <div class="rag-eval-run">
          <div>${new Date(r.createdAt).toLocaleString()} — ${r.results.length} queries, avg ${r.avgScore?.toFixed(3) || '—'}</div>
          <div class="rag-eval-run-config">topK=${r.config?.topK} · thresh=${r.config?.similarityThreshold} · ${r.config?.searchStrategy}</div>
        </div>
      `).join('')}</div>` : ''}
      <div id="rag-eval-results"></div>
    `;

    this.root.querySelector('#rag-eval-add-q')?.addEventListener('click', () => this.addQuestion(collection.id));
    this.root.querySelector('#rag-eval-import')?.addEventListener('click', () => this.importEvalSet(collection.id));
    this.root.querySelector('#rag-eval-run')?.addEventListener('click', () => this.runBatch(collection.id));
    this.root.querySelector('#rag-eval-export')?.addEventListener('click', () => this.exportRuns(collection.id));
    this.root.querySelector('#rag-eval-export-md')?.addEventListener('click', () => this.exportMarkdownReport(collection.id));
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

  importEvalSet(collectionId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const questions = data.evalSet?.questions || data.questions || [];
        if (!questions.length) throw new Error('No questions found');
        const set = ragState.getEvalSet(collectionId);
        for (const q of questions) {
          if (q.query) ragState.addEvalQuestion(collectionId, q.query, q.expectedKeywords || '', q.notes || '');
        }
        showToast(`Imported ${questions.length} questions`);
      } catch (e) {
        showToast(e.message, { isError: true });
      }
    });
    input.click();
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
    const searchOpts = {
      topK: settings.topK,
      similarityThreshold: settings.similarityThreshold,
      searchStrategy: settings.searchStrategy,
      docIds: settings.retrievalDocIds?.length ? settings.retrievalDocIds : undefined,
    };
    const results = [];
    let scoreSum = 0;

    try {
      for (const q of evalSet.questions) {
        const start = Date.now();
        const { embeddings } = await createEmbeddings(
          settings.embeddingProvider,
          key,
          settings.embeddingModel,
          [q.query],
          settings.corsProxyUrl,
        );
        const queryEmbedding = embeddings[0];
        const retrieved = searchChunks(queryEmbedding, chunks, searchOpts);
        const topScore = retrieved[0]?.score ?? 0;
        scoreSum += topScore;
        const contextText = retrieved.map(r => r.chunk.text).join(' ');
        const kwHit = keywordHitScore(contextText, q.expectedKeywords);
        results.push({
          query: q.query,
          chunksFound: retrieved.length,
          topScore,
          topDoc: retrieved[0]?.chunk?.docName || '—',
          latency: parseFloat(((Date.now() - start) / 1000).toFixed(2)),
          keywordHitPct: kwHit,
          passed: retrieved.length > 0 && topScore >= settings.similarityThreshold,
        });
      }

      const config = {
        topK: settings.topK,
        similarityThreshold: settings.similarityThreshold,
        searchStrategy: settings.searchStrategy,
        chunkSize: settings.chunkSize,
        maxContextChars: settings.maxContextChars,
        retrievalDocIds: settings.retrievalDocIds,
      };
      const run = {
        collectionId,
        config,
        results,
        avgScore: results.length ? scoreSum / results.length : 0,
      };
      ragState.addEvalRun(run);
      this.lastRun = run;

      const prevRun = ragState.getEvalRuns(collectionId)[1];
      const compareNote = prevRun
        ? ` vs prior avg ${prevRun.avgScore?.toFixed(3)} (${run.avgScore >= prevRun.avgScore ? '+' : ''}${(run.avgScore - prevRun.avgScore).toFixed(3)})`
        : '';

      if (resultsEl) {
        resultsEl.innerHTML = `
          <p class="settings-hint">Avg top score: ${run.avgScore.toFixed(3)}${compareNote}</p>
          <table class="rag-eval-table">
            <thead><tr><th>Query</th><th>Chunks</th><th>Top score</th><th>Source</th><th>Latency</th><th>KW%</th></tr></thead>
            <tbody>${results.map(r => `
              <tr class="${r.passed ? 'rag-eval-pass' : 'rag-eval-fail'}">
                <td>${escapeHtml(r.query.slice(0, 36))}${r.query.length > 36 ? '…' : ''}</td>
                <td>${r.chunksFound}</td>
                <td>${r.topScore.toFixed(3)}</td>
                <td>${escapeHtml(r.topDoc.slice(0, 20))}</td>
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

  exportMarkdownReport(collectionId) {
    const runs = ragState.getEvalRuns(collectionId);
    const evalSet = ragState.getEvalSet(collectionId);
    const latest = runs[0] || this.lastRun;
    if (!latest) {
      showToast('Run eval first', { isError: true });
      return;
    }
    const lines = [
      '# RAG Eval Report',
      '',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      '## Config',
      `- topK: ${latest.config?.topK}`,
      `- similarity threshold: ${latest.config?.similarityThreshold}`,
      `- strategy: ${latest.config?.searchStrategy}`,
      `- chunk size: ${latest.config?.chunkSize}`,
      '',
      `## Summary`,
      `- Questions: ${latest.results.length}`,
      `- Avg top score: ${latest.avgScore?.toFixed(3)}`,
      `- Passed: ${latest.results.filter(r => r.passed).length}/${latest.results.length}`,
      '',
      '## Results',
      '',
      '| Query | Chunks | Score | Passed | KW% |',
      '| --- | --- | --- | --- | --- |',
      ...latest.results.map(r =>
        `| ${r.query.replace(/\|/g, '\\|').slice(0, 40)} | ${r.chunksFound} | ${r.topScore.toFixed(3)} | ${r.passed ? 'yes' : 'no'} | ${r.keywordHitPct ?? '—'} |`,
      ),
      '',
      `Eval set: ${evalSet.questions.length} questions stored`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rag-eval-report-${collectionId.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report downloaded');
  }
}
