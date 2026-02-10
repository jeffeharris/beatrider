export function isAudioDebugEnabled() {
  if (typeof window === 'undefined') return false;

  if (window.__DEBUG_AUDIO__ === true) return true;

  try {
    if (window.localStorage?.getItem('debugAudio') === '1') {
      return true;
    }
  } catch (_) {
    // Ignore storage access errors (private mode, sandboxed contexts, etc.).
  }

  try {
    const params = new URLSearchParams(window.location?.search || '');
    return params.get('debugAudio') === '1';
  } catch (_) {
    return false;
  }
}

export function logAudioError(context, error) {
  if (!isAudioDebugEnabled()) return;
  console.warn(`[audio] ${context}`, error);
}

export function logAudioDebug(message, details) {
  if (!isAudioDebugEnabled()) return;
  if (typeof details === 'undefined') {
    console.log(`[audio] ${message}`);
    return;
  }
  console.log(`[audio] ${message}`, details);
}
