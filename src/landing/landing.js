import './landing.css';
import {
  LANDING,
  PROVIDERS,
  HERO_BADGES,
  WORKSPACES,
  CAPABILITIES,
  CHAT_MANAGEMENT,
  RAG_FEATURES,
  USE_CASES,
  COMPARE_ROWS,
  SHORTCUTS,
  FAQ,
  SETUP_STEPS,
  MARQUEE_ITEMS,
} from './content.js';

let teardownFns = [];
let mounted = false;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function splitTitleHtml(text) {
  return [...text]
    .map((char) => {
      if (char === ' ') {
        return '<span class="landing-char landing-char--space" aria-hidden="true">&nbsp;</span>';
      }
      return `<span class="landing-char">${escapeHtml(char)}</span>`;
    })
    .join('');
}

function renderMarqueeTrack(items) {
  return items
    .map((name, i) => {
      const dot = i < items.length - 1 ? '<span class="landing-marquee-dot" aria-hidden="true">·</span>' : '';
      return `<span class="landing-marquee-item">${escapeHtml(name)}</span>${dot}`;
    })
    .join('');
}

function renderSectionHeader(section) {
  return `
    <p class="landing-section-eyebrow">${escapeHtml(section.eyebrow)}</p>
    <h2 class="landing-section-headline">${escapeHtml(section.headline)}</h2>
    <p class="landing-section-lead">${escapeHtml(section.body)}</p>
  `;
}

function renderLandingHtml() {
  const { appName, tagline, cta, hero } = LANDING;
  const marqueeTrack = renderMarqueeTrack(MARQUEE_ITEMS);

  return `
    <div class="landing-page">
      <header class="landing-nav">
        <a class="landing-brand" href="/" aria-label="${escapeHtml(appName)} home">
          <img src="/icon.png" alt="" width="32" height="32" />
          <span class="landing-brand-text">${escapeHtml(appName)}</span>
        </a>
        <nav class="landing-nav-links" aria-label="Page sections">
          <a href="#landing-capabilities">Features</a>
          <a href="#landing-rag">RAG</a>
          <a href="#landing-faq">FAQ</a>
        </nav>
        <button type="button" class="landing-nav-cta" data-action="app">${escapeHtml(cta.primary)}</button>
      </header>

      <section class="landing-hero" aria-labelledby="landing-hero-title">
        <div class="landing-badges">
          ${HERO_BADGES.map((b) => `<span class="landing-badge">${escapeHtml(b)}</span>`).join('')}
        </div>
        <p class="landing-hero-eyebrow">${escapeHtml(hero.eyebrow)}</p>
        <h1 class="landing-hero-title" id="landing-hero-title">${splitTitleHtml(appName)}</h1>
        <p class="landing-hero-tagline">${escapeHtml(hero.subhead)}</p>
        <div class="landing-hero-actions">
          <button type="button" class="landing-btn landing-btn--primary" data-action="app">${escapeHtml(cta.primary)}</button>
          <button type="button" class="landing-btn landing-btn--ghost" data-action="rag">${escapeHtml(cta.rag)}</button>
        </div>
        <div class="landing-code-preview landing-reveal">
          <div class="landing-code-label">Quick setup</div>
          <pre class="landing-code-block"><code>Settings → Provider → Verify API key → Pick model
Compare mode → Select up to 3 models → Send one prompt
${LANDING.ragLabel} → Upload PDF/DOCX → Ask grounded questions</code></pre>
        </div>
      </section>

      <div class="landing-marquee-wrap" aria-hidden="true">
        <div class="landing-marquee" id="landing-marquee">
          <div class="landing-marquee-track">${marqueeTrack}</div>
          <div class="landing-marquee-track">${marqueeTrack}</div>
        </div>
      </div>

      <section class="landing-section landing-reveal" id="landing-overview">
        <div class="landing-section-inner">
          ${renderSectionHeader(LANDING.overview)}
        </div>
      </section>

      <section class="landing-section landing-section--band landing-reveal" id="landing-workspaces">
        <div class="landing-section-inner">
          ${renderSectionHeader(LANDING.workspaces)}
          <div class="landing-mode-grid">
            ${WORKSPACES.map((w) => `
              <article class="landing-mode-card">
                <div class="landing-mode-cmd">${escapeHtml(w.command)}</div>
                <h3>${escapeHtml(w.title)}</h3>
                <p><strong>Best for:</strong> ${escapeHtml(w.bestFor)}</p>
                <p class="landing-mode-limits"><strong>Notes:</strong> ${escapeHtml(w.limits)}</p>
                <button type="button" class="landing-btn landing-btn--ghost landing-btn--sm" data-action="${escapeHtml(w.action)}">Open ${escapeHtml(w.title)}</button>
              </article>
            `).join('')}
          </div>
        </div>
      </section>

      <section class="landing-section landing-reveal" id="landing-providers">
        <div class="landing-section-inner">
          ${renderSectionHeader(LANDING.providers)}
          <div class="landing-provider-grid">
            ${PROVIDERS.map((p) => `
              <article class="landing-provider-card">
                <h3>${escapeHtml(p.name)}</h3>
                <p>${escapeHtml(p.use)}</p>
              </article>
            `).join('')}
          </div>
        </div>
      </section>

      <section class="landing-section landing-section--dark landing-pin landing-reveal" id="landing-capabilities">
        <div class="landing-section-inner landing-pin-panel" id="landing-pin-panel">
          ${renderSectionHeader(LANDING.capabilities)}
          <div class="landing-pin-stack" id="landing-pin-stack">
            ${CAPABILITIES.slice(0, 6).map((f, i) => `
              <p class="landing-pin-line${i === 0 ? ' is-active' : ''}" data-pin-index="${i}">${escapeHtml(f.title)}</p>
            `).join('')}
          </div>
          <div class="landing-cap-grid">
            ${CAPABILITIES.map((cap) => `
              <article class="landing-cap-card">
                <span class="landing-cap-tag">${escapeHtml(cap.tag)}</span>
                <h3>${escapeHtml(cap.title)}</h3>
                <p>${escapeHtml(cap.body)}</p>
                <pre class="landing-code-block landing-code-block--sm"><code>${escapeHtml(cap.example)}</code></pre>
              </article>
            `).join('')}
          </div>
        </div>
      </section>

      <section class="landing-section landing-reveal" id="landing-chat-mgmt">
        <div class="landing-section-inner">
          ${renderSectionHeader(LANDING.chatManagement)}
          <div class="landing-feature-grid">
            ${CHAT_MANAGEMENT.map((item) => `
              <article class="landing-feature-item">
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.body)}</p>
              </article>
            `).join('')}
          </div>
        </div>
      </section>

      <section class="landing-section landing-section--band landing-reveal" id="landing-export">
        <div class="landing-section-inner">
          ${renderSectionHeader(LANDING.export)}
          <ul class="landing-bullet-list">
            <li><strong>Export Markdown</strong> — download a .md file from any chat's ⋯ menu</li>
            <li><strong>Copy share link</strong> — encode the chat in a URL for browser playback</li>
            <li><strong>Export HTML</strong> — standalone readable HTML file</li>
            <li><strong>Bulk import/export</strong> — all chats and settings from Settings → Data</li>
            <li><strong>Usage JSON</strong> — export token and cost stats from the Usage dashboard</li>
          </ul>
        </div>
      </section>

      <section class="landing-section landing-reveal" id="landing-rag">
        <div class="landing-section-inner">
          ${renderSectionHeader(LANDING.rag)}
          <div class="landing-table-wrap">
            <table class="landing-table">
              <thead>
                <tr><th>Area</th><th>What you can do</th></tr>
              </thead>
              <tbody>
                ${RAG_FEATURES.map((row) => `
                  <tr><td><strong>${escapeHtml(row.area)}</strong></td><td>${escapeHtml(row.detail)}</td></tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="landing-hero-actions" style="margin-top: 32px;">
            <button type="button" class="landing-btn landing-btn--primary" data-action="rag">${escapeHtml(cta.rag)}</button>
          </div>
        </div>
      </section>

      <section class="landing-section landing-section--band landing-reveal" id="landing-use-cases">
        <div class="landing-section-inner">
          ${renderSectionHeader(LANDING.useCases)}
          <div class="landing-use-grid">
            ${USE_CASES.map((uc) => `
              <article class="landing-use-card">
                <h3>${escapeHtml(uc.title)}</h3>
                <p>${escapeHtml(uc.body)}</p>
                <div class="landing-use-tags">
                  ${uc.tags.map((t) => `<span class="landing-use-tag">${escapeHtml(t)}</span>`).join('')}
                </div>
              </article>
            `).join('')}
          </div>
        </div>
      </section>

      <section class="landing-section landing-reveal" id="landing-compare">
        <div class="landing-section-inner">
          ${renderSectionHeader(LANDING.compare)}
          <div class="landing-table-wrap">
            <table class="landing-table landing-table--compare">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>${escapeHtml(appName)}</th>
                  <th>Web chat apps</th>
                  <th>DIY CLI</th>
                </tr>
              </thead>
              <tbody>
                ${COMPARE_ROWS.map((row) => `
                  <tr>
                    <td>${escapeHtml(row.feature)}</td>
                    <td>${renderCompareCell(row.sandbox)}</td>
                    <td>${renderCompareCell(row.webChat)}</td>
                    <td>${renderCompareCell(row.cli)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="landing-section landing-section--dark landing-reveal" id="landing-architecture">
        <div class="landing-section-inner">
          ${renderSectionHeader(LANDING.architecture)}
          <div class="landing-arch-grid">
            <article class="landing-arch-card">
              <h3>Browser UI</h3>
              <p>Chat playground, RAG sandbox, settings, prompt library, usage dashboard — all rendered client-side.</p>
            </article>
            <article class="landing-arch-card">
              <h3>Local storage</h3>
              <p>Chats, keys, settings in localStorage. RAG documents and vectors in IndexedDB. Nothing on an app server.</p>
            </article>
            <article class="landing-arch-card">
              <h3>Direct provider APIs</h3>
              <p>Messages and embeddings go straight from your browser to OpenAI, Anthropic, Gemini, Groq, DeepSeek, or OpenRouter.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="landing-section landing-reveal" id="landing-privacy">
        <div class="landing-section-inner">
          ${renderSectionHeader(LANDING.privacy)}
        </div>
      </section>

      <section class="landing-section landing-section--band landing-reveal" id="landing-setup">
        <div class="landing-section-inner">
          ${renderSectionHeader(LANDING.quickStart)}
          <ol class="landing-steps">
            ${SETUP_STEPS.map((step, i) => `
              <li class="landing-step">
                <span class="landing-step-num">${String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>${escapeHtml(step.title)}</h3>
                  <p>${escapeHtml(step.body)}</p>
                  <pre class="landing-code-block landing-code-block--sm"><code>${escapeHtml(step.code)}</code></pre>
                </div>
              </li>
            `).join('')}
          </ol>
          <div class="landing-hero-actions" style="margin-top: 40px;">
            <button type="button" class="landing-btn landing-btn--primary" data-action="app">${escapeHtml(cta.primary)}</button>
          </div>
        </div>
      </section>

      <section class="landing-section landing-reveal" id="landing-shortcuts">
        <div class="landing-section-inner">
          ${renderSectionHeader(LANDING.shortcuts)}
          <div class="landing-table-wrap">
            <table class="landing-table">
              <thead>
                <tr><th>Shortcut</th><th>Action</th></tr>
              </thead>
              <tbody>
                ${SHORTCUTS.map((s) => `
                  <tr><td><code>${escapeHtml(s.keys)}</code></td><td>${escapeHtml(s.action)}</td></tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="landing-section landing-section--band landing-reveal" id="landing-faq">
        <div class="landing-section-inner">
          ${renderSectionHeader(LANDING.faq)}
          <dl class="landing-faq">
            ${FAQ.map((item) => `
              <div class="landing-faq-item">
                <dt>${escapeHtml(item.q)}</dt>
                <dd>${escapeHtml(item.a)}</dd>
              </div>
            `).join('')}
          </dl>
        </div>
      </section>

      <section class="landing-closing landing-reveal" id="landing-closing">
        <p class="landing-closing-eyebrow">${escapeHtml(tagline)}</p>
        <h2 class="landing-closing-headline">${escapeHtml(cta.closing)}</h2>
        <div class="landing-closing-actions">
          <button type="button" class="landing-btn landing-btn--primary" data-action="app">${escapeHtml(cta.primary)}</button>
          <button type="button" class="landing-btn landing-btn--ghost" data-action="rag">${escapeHtml(cta.rag)}</button>
        </div>
      </section>

      <footer class="landing-footer">
        <span>${escapeHtml(appName)} — client-side LLM playground</span>
        <button type="button" id="landing-back-top">Back to top</button>
      </footer>
    </div>
  `;
}

function renderCompareCell(value) {
  if (value === true) return '<span class="landing-check">Yes</span>';
  if (value === false) return '<span class="landing-cross">No</span>';
  return escapeHtml(String(value));
}

function bindActions(root, onApp, onRag) {
  root.querySelectorAll('[data-action="app"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      onApp();
    });
  });
  root.querySelectorAll('[data-action="rag"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      onRag();
    });
  });
  root.querySelector('#landing-back-top')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  root.querySelector('.landing-brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  root.querySelectorAll('.landing-nav-links a').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href?.startsWith('#')) return;
      e.preventDefault();
      const target = root.querySelector(href);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function initAnimations(root) {
  if (prefersReducedMotion()) {
    root.querySelectorAll('.landing-reveal').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);

  gsap.registerPlugin(ScrollTrigger);
  teardownFns.push(() => ScrollTrigger.getAll().forEach((t) => t.kill()));

  const chars = root.querySelectorAll('.landing-hero-title .landing-char:not(.landing-char--space)');
  gsap.set(chars, { opacity: 0, y: 48, rotateX: -40 });
  gsap.to(chars, {
    opacity: 1,
    y: 0,
    rotateX: 0,
    duration: 0.72,
    stagger: 0.025,
    ease: 'power3.out',
    delay: 0.15,
  });

  const marquee = root.querySelector('#landing-marquee');
  if (marquee) {
    const trackWidth = marquee.querySelector('.landing-marquee-track')?.offsetWidth || 0;
    if (trackWidth > 0) {
      const tween = gsap.to(marquee, {
        x: -trackWidth,
        duration: trackWidth / 80,
        ease: 'none',
        repeat: -1,
      });
      teardownFns.push(() => tween.kill());
    }
  }

  root.querySelectorAll('.landing-reveal').forEach((section) => {
    gsap.to(section, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 82%',
        toggleActions: 'play none none none',
      },
    });
  });

  const pinPanel = root.querySelector('#landing-pin-panel');
  const pinLines = root.querySelectorAll('.landing-pin-line');
  if (pinPanel && pinLines.length) {
    ScrollTrigger.create({
      trigger: root.querySelector('#landing-capabilities'),
      start: 'top top',
      end: '+=100%',
      pin: pinPanel,
      pinSpacing: true,
    });

    pinLines.forEach((line, index) => {
      ScrollTrigger.create({
        trigger: root.querySelector('#landing-capabilities'),
        start: `top+=${index * 16}% top`,
        end: `top+=${(index + 1) * 16}% top`,
        onEnter: () => setActivePinLine(pinLines, index),
        onEnterBack: () => setActivePinLine(pinLines, index),
      });
    });
  }
}

function setActivePinLine(lines, activeIndex) {
  lines.forEach((line, i) => {
    line.classList.toggle('is-active', i === activeIndex);
  });
}

function teardownAnimations() {
  teardownFns.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
  teardownFns = [];
}

export async function mountLanding({ onApp, onRag }) {
  const root = document.getElementById('landing-view');
  if (!root) return;

  root.innerHTML = renderLandingHtml();
  bindActions(root, onApp, onRag);
  mounted = true;

  document.body.classList.add('landing-body');
  window.scrollTo(0, 0);
  teardownAnimations();
  await initAnimations(root);
}

export function unmountLanding() {
  teardownAnimations();
  document.body.classList.remove('landing-body');
  mounted = false;
}
