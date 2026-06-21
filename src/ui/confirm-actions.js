import { showConfirm } from './modal.js';

export async function confirmRegenerate({ removesFollowing = false } = {}) {
  const message = removesFollowing
    ? 'Messages from this point onward will be removed and a new response will be generated.'
    : 'The current assistant reply will be replaced with a new one.';
  return showConfirm({
    title: 'Regenerate response?',
    message,
    confirmText: 'Regenerate',
    destructive: true,
  });
}

export async function confirmRegenerateAs({ model, profile } = {}) {
  const parts = [];
  if (model) parts.push(model.split('/').pop() || model);
  if (profile) parts.push(profile);
  const detail = parts.length ? ` using ${parts.join(' · ')}` : '';
  return showConfirm({
    title: 'Regenerate with different settings?',
    message: `The current reply will be replaced${detail}. Messages after this point will be removed.`,
    confirmText: 'Regenerate',
    destructive: true,
  });
}

export async function confirmEditRegenerate() {
  return showConfirm({
    title: 'Edit and regenerate?',
    message: 'Your edit will be saved and all messages after this point will be removed.',
    confirmText: 'Save & regenerate',
    destructive: true,
  });
}

export async function confirmPickCompare(model) {
  const label = model?.split('/').pop() || model || 'this model';
  return showConfirm({
    title: 'Use this response?',
    message: `Continue the chat with ${label}? Other compare results will be discarded.`,
    confirmText: 'Use this response',
    destructive: true,
  });
}

export async function confirmClearChat(context = 'playground') {
  const where = context === 'rag' ? 'RAG chat' : 'chat';
  return showConfirm({
    title: 'Clear chat?',
    message: `All messages in this ${where} will be removed. You can roll back afterward if needed.`,
    confirmText: 'Clear chat',
    destructive: true,
  });
}

export async function confirmRetry() {
  return showConfirm({
    title: 'Retry request?',
    message: 'The failed response will be removed and a new one will be generated.',
    confirmText: 'Retry',
  });
}
