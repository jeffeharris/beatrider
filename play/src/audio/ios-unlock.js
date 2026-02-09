import * as Tone from 'tone';

// iOS Audio Unlock - comprehensive fallback for iOS Safari
// iOS requires audio to be "unlocked" via user gesture before WebAudio works
export const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
export const isSafariAudio = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
export let iosAudioUnlocked = false;
let unlockInFlight = null;

// Silent audio data URI (tiny valid MP3) - most reliable iOS unlock method
const IOS_UNLOCK_AUDIO_PATHS = ['/play/audio/unlock.wav', './audio/unlock.wav'];

export async function unlockIOSAudio() {
  if (iosAudioUnlocked) return;
  if (unlockInFlight) return unlockInFlight;

  unlockInFlight = (async () => {
    console.log('Attempting iOS audio unlock...');

    try {
    // Method 1: HTML5 Audio element using a real file URL.
    if (isIOS) {
      for (const path of IOS_UNLOCK_AUDIO_PATHS) {
        const silentAudio = new Audio(path);
        silentAudio.setAttribute('playsinline', '');
        silentAudio.preload = 'auto';
        silentAudio.volume = 0.01;
        try {
          await silentAudio.play();
          silentAudio.pause();
          silentAudio.currentTime = 0;
          console.log('HTML5 Audio unlock successful');
          break;
        } catch (e) {
          // Try the next path.
        }
      }
    }

    // Method 2: Tone.js context resume
    if (typeof Tone !== 'undefined') {
      await Tone.start();
      console.log('Tone.start() called, state:', Tone.context.state);
      Tone.Destination.mute = false;

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
if (isIOS || isSafariAudio) {
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
