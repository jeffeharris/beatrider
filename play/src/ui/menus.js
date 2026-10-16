// menus.js - the DOM menus in index.html: the in-game buttons (#hud), the pause menu
// and the settings menu. This module only shows screens and routes input. During a run
// the Main scene decides which menu is open (systems/main-scene/menu-flow.js) and
// calls showMenu(); on the start screen there is no run, so settings opens directly.
//
// Kept free of Tone and Phaser imports so it can load with the start screen.

const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeHzYiQAqJ_1VR6PAXgsBdJxkYte-UcwBlC1w83dJ0gopqBNQ/viewform';

const byId = (id) => document.getElementById(id);

let openMenu = 'none';
// Set while settings is open from the start screen; called when it closes.
let startScreenClose = null;
let beforeOpenSettings = null;

function activeRun() {
  const scene = window.gameScene;
  return scene?.scene?.isActive() ? scene : null;
}

function trackEventSafe(eventName, params) {
  if (typeof window.trackEvent === 'function') {
    window.trackEvent(eventName, params);
  }
}

function selectTab(name) {
  document.querySelectorAll('#settingsMenu [role="tab"]').forEach(tab => {
    tab.setAttribute('aria-selected', String(tab.dataset.tab === name));
  });
  document.querySelectorAll('#settingsMenu [role="tabpanel"]').forEach(panel => {
    panel.hidden = panel.dataset.panel !== name;
  });
}

// Focus the card itself: keys reach the menu and Tab walks its controls, without a
// focus ring appearing on a control the player didn't pick.
function focusCard(screen) {
  screen.querySelector('.menu-card')?.focus({ preventScroll: true });
}

/**
 * Show one menu screen (or none).
 * @param {'none'|'pause'|'settings'} menu
 * @param {{ score?: number, highScore?: number, overGame?: boolean }} [info]
 */
export function showMenu(menu, info = {}) {
  const pauseMenu = byId('pauseMenu');
  const settingsMenu = byId('settingsMenu');
  const wasOpen = openMenu;
  openMenu = menu;

  pauseMenu.hidden = menu !== 'pause';
  settingsMenu.hidden = menu !== 'settings';
  byId('hud').classList.toggle('menu-open', menu !== 'none');

  if (menu === 'pause') {
    byId('pauseScore').textContent = info.score ?? 0;
    byId('pauseHighScore').textContent = info.highScore ?? 0;
  }
  if (menu === 'settings') {
    settingsMenu.classList.toggle('over-game', Boolean(info.overGame));
    beforeOpenSettings?.();
  }
  if (menu !== 'none' && menu !== wasOpen) {
    focusCard(menu === 'pause' ? pauseMenu : settingsMenu);
  }
  if (menu === 'none' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

export function setHudVisible(visible) {
  byId('hud').hidden = !visible;
}

export function isMenuOpen() {
  return openMenu !== 'none';
}

/**
 * Open settings from the start screen, where no run exists to freeze.
 * @param {'game'|'music'} tab
 * @param {() => void} [onClose]
 */
export function openStartScreenSettings(tab, onClose) {
  startScreenClose = onClose || null;
  selectTab(tab);
  showMenu('settings');
}

// Music has its own shortcuts (HUD, pause menu, start screen), so each entry point
// names the tab it opens on.
function openRunSettings(run, tab) {
  selectTab(tab);
  run.openSettings();
}

/** Called each time settings opens, so its controls show current values. */
export function onSettingsOpen(callback) {
  beforeOpenSettings = callback;
}

function closeSettings() {
  const run = activeRun();
  if (run) {
    run.closeSettings();
    return;
  }
  showMenu('none');
  const onClose = startScreenClose;
  startScreenClose = null;
  onClose?.();
}

// Back out one level: settings -> where it came from, pause -> play, play -> pause.
function goBack() {
  const run = activeRun();
  if (openMenu === 'settings') closeSettings();
  else if (openMenu === 'pause') run?.resumeGame();
  else run?.pauseGame();
}

const PAUSE_ACTIONS = {
  resume: (run) => run.resumeGame(),
  settings: (run) => openRunSettings(run, 'game'),
  music: (run) => openRunSettings(run, 'music'),
  restart: (run) => run.restartRun(),
  quit: (run) => run.quitToTitle(),
  feedback: (run) => {
    trackEventSafe('feedback_form_opened_from_pause', { score: run.stateSlices.combat.score });
    window.open(FEEDBACK_FORM_URL, '_blank', 'noopener');
  }
};

let initialized = false;

export function initMenus() {
  if (initialized) return;
  initialized = true;

  byId('pauseBtn').addEventListener('click', () => activeRun()?.pauseGame());
  byId('settingsBtn').addEventListener('click', () => {
    const run = activeRun();
    if (run) openRunSettings(run, 'game');
  });
  byId('musicBtn').addEventListener('click', () => {
    const run = activeRun();
    if (run) openRunSettings(run, 'music');
  });

  byId('pauseMenu').addEventListener('click', (e) => {
    const run = activeRun();
    if (!run) return;
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action) {
      PAUSE_ACTIONS[action]?.(run);
    } else if (e.target === e.currentTarget) {
      // Tapping outside the card resumes, like the old "tap to continue".
      run.resumeGame();
    }
  });

  byId('settingsMenu').addEventListener('click', (e) => {
    if (e.target.closest('[data-action="close-settings"]') || e.target === e.currentTarget) {
      closeSettings();
      return;
    }
    const tab = e.target.closest('[role="tab"]');
    if (tab) selectTab(tab.dataset.tab);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (openMenu === 'none' && !activeRun()) return;
      e.preventDefault();
      goBack();
      return;
    }

    // SPACE resumes from the pause menu unless a button has focus (it handles its own).
    if (openMenu === 'pause' && e.key === ' ' && !(document.activeElement instanceof HTMLButtonElement)) {
      e.preventDefault();
      activeRun()?.resumeGame();
    }
  });
}
