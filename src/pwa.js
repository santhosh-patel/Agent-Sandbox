let deferredPrompt = null;

export function registerPWA() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    hideInstallBanner();
  });

  document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
    hideInstallBanner();
    localStorage.setItem('pwa-install-dismissed', '1');
  });

  if (window.matchMedia('(display-mode: standalone)').matches) {
    hideInstallBanner();
  } else if (!localStorage.getItem('pwa-install-dismissed')) {
    setTimeout(showInstallBanner, 3000);
  }
}

function showInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner && !localStorage.getItem('pwa-install-dismissed')) {
    banner.hidden = false;
  }
}

function hideInstallBanner() {
  document.getElementById('pwa-install-banner')?.setAttribute('hidden', '');
}
