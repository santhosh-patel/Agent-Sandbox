import './landing.css';
import { LANDING, PROVIDERS, FEATURES, QUICK_START, MARQUEE_ITEMS } from './content.js';

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

function renderLandingHtml(onApp, onRag) {
  const { appName, tagline, cta } = LANDING;
  const marqueeTrack = renderMarqueeTrack(MARQUEE_ITEMS);

  return `
    <div class="landing-page">
      <header class="landing-nav">
        <a class="landing-brand" href="/" aria-label="${escapeHtml(appName)} home">
          <img src="/icon.png" alt="" width="32" height="32" />
          <span class="landing-brand-text">${escapeHtml(appName)}</span>
        </a>
        <button type="button" class="landing-nav-cta" data-action="app">${escapeHtml(cta.primary)}</button>
      </header>

      <section class="landing-hero" aria-labelledby="landing-hero-title">
        <p class="landing-hero-eyebrow">Bring your own keys</p>
        <h1 class="landing-hero-title" id="landing-hero-title">${splitTitleHtml(appName)}</h1>
        <p class="landing-hero-tagline">${escapeHtml(tagline)}</p>
        <div class="landing-hero-actions">
          <button type="button" class="landing-btn landing-btn--primary" data-action="app">${escapeHtml(cta.primary)}</button>
          <button type="button" class="landing-btn landing-btn--ghost" data-action="rag">${escapeHtml(cta.rag)}</button>
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
          <p class="landing-section-eyebrow">${escapeHtml(LANDING.overview.eyebrow)}</p>
          <h2 class="landing-section-headline">${escapeHtml(LANDING.overview.headline)}</h2>
          <p class="landing-section-body">${escapeHtml(LANDING.overview.body)}</p>
        </div>
      </section>

      <section class="landing-section landing-section--band landing-reveal" id="landing-providers">
        <div class="landing-section-inner">
          <p class="landing-section-eyebrow">${escapeHtml(LANDING.providers.eyebrow)}</p>
          <h2 class="landing-section-headline">${escapeHtml(LANDING.providers.headline)}</h2>
          <p class="landing-section-lead">${escapeHtml(LANDING.providers.body)}</p>
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

      <section class="landing-section landing-section--dark landing-pin landing-reveal" id="landing-features">
        <div class="landing-section-inner landing-pin-panel" id="landing-pin-panel">
          <p class="landing-section-eyebrow">${escapeHtml(LANDING.features.eyebrow)}</p>
          <h2 class="landing-section-headline">${escapeHtml(LANDING.features.headline)}</h2>
          <p class="landing-section-lead">${escapeHtml(LANDING.features.body)}</p>
          <div class="landing-pin-stack" id="landing-pin-stack">
            ${FEATURES.map((f, i) => `
              <p class="landing-pin-line${i === 0 ? ' is-active' : ''}" data-pin-index="${i}">${escapeHtml(f.title)}</p>
            `).join('')}
          </div>
          <div class="landing-feature-grid">
            ${FEATURES.map((f) => `
              <article class="landing-feature-item">
                <h3>${escapeHtml(f.title)}</h3>
                <p>${escapeHtml(f.body)}</p>
              </article>
            `).join('')}
          </div>
        </div>
      </section>

      <section class="landing-section landing-reveal" id="landing-rag">
        <div class="landing-section-inner">
          <p class="landing-section-eyebrow">${escapeHtml(LANDING.rag.eyebrow)}</p>
          <h2 class="landing-section-headline">${escapeHtml(LANDING.rag.headline)}</h2>
          <p class="landing-section-body">${escapeHtml(LANDING.rag.body)}</p>
          <div class="landing-hero-actions" style="margin-top: 32px;">
            <button type="button" class="landing-btn landing-btn--ghost" data-action="rag">${escapeHtml(cta.rag)}</button>
          </div>
        </div>
      </section>

      <section class="landing-section landing-section--band landing-reveal" id="landing-privacy">
        <div class="landing-section-inner">
          <p class="landing-section-eyebrow">${escapeHtml(LANDING.privacy.eyebrow)}</p>
          <h2 class="landing-section-headline">${escapeHtml(LANDING.privacy.headline)}</h2>
          <p class="landing-section-body">${escapeHtml(LANDING.privacy.body)}</p>
        </div>
      </section>

      <section class="landing-section landing-reveal" id="landing-quickstart">
        <div class="landing-section-inner">
          <p class="landing-section-eyebrow">${escapeHtml(LANDING.quickStart.eyebrow)}</p>
          <h2 class="landing-section-headline">${escapeHtml(LANDING.quickStart.headline)}</h2>
          <p class="landing-section-lead">${escapeHtml(LANDING.quickStart.body)}</p>
          <ol class="landing-steps">
            ${QUICK_START.map((step, i) => `
              <li class="landing-step">
                <span class="landing-step-num">${i + 1}</span>
                <div>
                  <h3>${escapeHtml(step.title)}</h3>
                  <p>${escapeHtml(step.body)}</p>
                </div>
              </li>
            `).join('')}
          </ol>
        </div>
      </section>

      <section class="landing-closing landing-reveal" id="landing-closing">
        <h2 class="landing-closing-headline">${escapeHtml(cta.closing)}</h2>
        <div class="landing-closing-actions">
          <button type="button" class="landing-btn landing-btn--primary" data-action="app">${escapeHtml(cta.primary)}</button>
        </div>
      </section>

      <footer class="landing-footer">
        <span>${escapeHtml(appName)}</span>
        <button type="button" id="landing-back-top">Back to top</button>
      </footer>
    </div>
  `;
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
      trigger: root.querySelector('#landing-features'),
      start: 'top top',
      end: '+=120%',
      pin: pinPanel,
      pinSpacing: true,
    });

    pinLines.forEach((line, index) => {
      ScrollTrigger.create({
        trigger: root.querySelector('#landing-features'),
        start: `top+=${index * 18}% top`,
        end: `top+=${(index + 1) * 18}% top`,
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

  if (!mounted) {
    root.innerHTML = renderLandingHtml(onApp, onRag);
    bindActions(root, onApp, onRag);
    mounted = true;
  }

  document.body.classList.add('landing-body');
  window.scrollTo(0, 0);
  teardownAnimations();
  await initAnimations(root);
}

export function unmountLanding() {
  teardownAnimations();
  document.body.classList.remove('landing-body');
}
