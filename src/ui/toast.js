export function showToast(message, { isError = false, duration = 2500 } = {}) {
  const toast = document.createElement('div');
  toast.className = 'toast visible';
  if (isError) toast.style.borderColor = 'var(--error)';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
