/**
 * Sound Effects Hook using Web Audio API
 * Generates synthesized sounds for game feedback without external audio files
 */

// Singleton AudioContext to avoid creating multiple contexts
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

// Volume state (synced with AudioPlayer)
let globalVolume = 0.5;
let isMuted = false;

export const setSFXVolume = (volume: number) => {
  globalVolume = Math.max(0, Math.min(1, volume));
};

export const setSFXMuted = (muted: boolean) => {
  isMuted = muted;
};

// Sound generation functions
const playTone = (
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volumeMultiplier: number = 1
) => {
  if (isMuted || globalVolume === 0) return;

  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  const volume = globalVolume * volumeMultiplier * 0.85; // SFX volume
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
};

const playChord = (
  frequencies: number[],
  duration: number,
  type: OscillatorType = 'sine',
  volumeMultiplier: number = 1
) => {
  frequencies.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, duration, type, volumeMultiplier / frequencies.length);
    }, i * 30); // Slight arpeggio effect
  });
};

// Exported sound functions
export const sfx = {
  /** Success sound - ascending major chord */
  success: () => {
    playChord([523.25, 659.25, 783.99], 0.3, 'sine', 1.2); // C5, E5, G5
  },

  /** Error sound - dissonant buzz */
  error: () => {
    playTone(150, 0.15, 'sawtooth', 0.8);
    setTimeout(() => playTone(120, 0.2, 'sawtooth', 0.6), 100);
  },

  /** Click/tap sound - short blip */
  click: () => {
    playTone(800, 0.05, 'sine', 0.5);
  },

  /** Keypress sound - typewriter-like */
  keypress: () => {
    playTone(600 + Math.random() * 200, 0.04, 'square', 0.3);
  },

  /** Delete/backspace sound */
  delete: () => {
    playTone(300, 0.08, 'sine', 0.4);
  },

  /** Sync pulse - steady tone for aligned players */
  syncPulse: () => {
    playTone(440, 0.1, 'sine', 0.4);
  },

  /** Lock-in sound - when entering sweet spot */
  lockIn: () => {
    playChord([392, 523.25], 0.15, 'sine', 0.6); // G4, C5
  },

  /** Victory fanfare - triumphant ascending */
  victory: () => {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.4 - i * 0.05, 'sine', 1), i * 120);
    });
  },

  /** Defeat sound - descending sad tones */
  defeat: () => {
    const notes = [392, 349.23, 311.13]; // G4, F4, Eb4
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.5, 'sine', 0.6), i * 200);
    });
  },

  /** Scan beep - short confirmation */
  scan: () => {
    playTone(1000, 0.08, 'sine', 0.5);
    setTimeout(() => playTone(1200, 0.06, 'sine', 0.4), 100);
  },

  /** View transition whoosh */
  transition: () => {
    const ctx = getAudioContext();
    if (isMuted || globalVolume === 0) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);

    const volume = globalVolume * 0.2;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  },
};

// React hook for components
export function useSFX() {
  return sfx;
}

export default useSFX;
