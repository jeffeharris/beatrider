import * as Tone from 'tone';

// iOS Audio Unlock - comprehensive fallback for iOS Safari
// iOS requires audio to be "unlocked" via user gesture before WebAudio works
export const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
export const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
export let iosAudioUnlocked = false;
let unlockInFlight = null;

// Silent audio data URI (tiny valid MP3) - most reliable iOS unlock method
const SILENT_AUDIO_DATA = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQDgAAAAAAAAAGw/+M4xAALAAqIAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

export async function unlockIOSAudio() {
  if (iosAudioUnlocked) return;
  if (unlockInFlight) return unlockInFlight;

  unlockInFlight = (async () => {
    console.log('Attempting iOS audio unlock...');

    try {
    // Method 1: HTML5 Audio element with silent MP3 (most reliable for iOS)
    if (isIOS) {
      const silentAudio = new Audio(SILENT_AUDIO_DATA);
      silentAudio.setAttribute('playsinline', '');
      silentAudio.volume = 0.01;
      try {
        await silentAudio.play();
        silentAudio.pause();
        silentAudio.remove();
        console.log('HTML5 Audio unlock successful');
      } catch (e) {
        // Some Safari variants reject inline data audio sources.
      }
    }

    // Method 2: Tone.js context resume
    if (typeof Tone !== 'undefined') {
      await Tone.start();
      console.log('Tone.start() called, state:', Tone.context.state);

      // Force resume if still suspended
      if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
        console.log('Context resumed, state:', Tone.context.state);
      }

      // Method 3 intentionally omitted. Mixing raw WebAudio nodes with Tone wrappers
      // can fail on some iOS/Safari combinations.
    }

    iosAudioUnlocked = true;
    console.log('iOS audio unlock complete, context state:', Tone?.context?.state);
    } catch (e) {
      console.warn('iOS audio unlock error:', e);
    } finally {
      unlockInFlight = null;
    }
  })();

  return unlockInFlight;
}

// Add touch/click listeners for iOS to unlock audio on first interaction
if (isIOS || isSafari) {
  const earlyUnlock = (e) => {
    // Only unlock on actual user gestures
    if (e.isTrusted) {
      unlockIOSAudio();
    }
  };
  // Use multiple event types for best coverage
  ['touchstart', 'touchend', 'click', 'keydown'].forEach(event => {
    document.addEventListener(event, earlyUnlock, { passive: true, once: true });
  });
}
