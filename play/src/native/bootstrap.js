// Native (Capacitor) startup wiring.
//
// Follows the same shape as Feltbound's `src/native/bootstrap.ts`: every plugin
// is dynamically imported so none of it enters the web bundle, and the whole
// module no-ops off-device. Beatrider needs far less than Feltbound did — there
// is no server, no auth, no push, and no IAP — so this is presentation only.

let cachedIsNative = null;

/**
 * True only inside the Capacitor WebView. Resolved via a dynamic import so the
 * web build never pulls in @capacitor/core at all.
 */
export async function isNativePlatform() {
  if (cachedIsNative !== null) return cachedIsNative;
  try {
    const { Capacitor } = await import('@capacitor/core');
    cachedIsNative = Capacitor.isNativePlatform();
  } catch (_) {
    cachedIsNative = false;
  }
  return cachedIsNative;
}

/**
 * Full-bleed presentation: hide the status bar and pin landscape-agnostic
 * fullscreen. The game canvas already handles its own resize (see
 * systems/main-scene/resize.js), so it just needs the chrome out of the way.
 */
async function configureChrome() {
  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.hide();
  } catch (_) {
    // Non-fatal — never block startup over chrome.
  }
}

/**
 * The web build registers a service worker for offline play. Inside Capacitor
 * the bundle is already on local disk, so a SW adds a redundant cache layer
 * that can serve stale assets after an app update. Tear down any that a prior
 * web visit left behind.
 */
async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch (_) {
    // Ignore — a stale SW is a nuisance, not a failure.
  }
}

/**
 * Called once from main.js before the game boots. Safe to call unconditionally.
 */
export async function initNative() {
  if (!(await isNativePlatform())) return;
  await configureChrome();
  await unregisterServiceWorkers();
}
