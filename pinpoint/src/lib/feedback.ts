/**
 * Tiny sound + haptic feedback layer using Web Audio API + Vibration API.
 * Zero asset weight — every sound is synthesised on the fly.
 *
 * Respects user preference: disabled until enableSound() called once,
 * persists in localStorage.
 */

let ctx: AudioContext | null = null;
const KEY = "pinpoint:sound-enabled";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) !== "false";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, enabled ? "true" : "false");
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = W.AudioContext ?? W.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  if (!isSoundEnabled()) return;
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export const sfx = {
  pin: () => tone(660, 0.12, "triangle"),
  submit: () => { tone(523, 0.1, "sine"); setTimeout(() => tone(784, 0.15, "sine"), 80); },
  reveal: () => { tone(440, 0.2, "sawtooth", 0.08); setTimeout(() => tone(660, 0.25, "triangle", 0.1), 180); },
  perfect: () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle"), i * 90));
  },
  fail: () => tone(180, 0.4, "sawtooth", 0.12),
  achievement: () => {
    [659, 784, 988, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.2, "triangle", 0.12), i * 70));
  },
  tick: () => tone(880, 0.05, "square", 0.06),
};

export function haptic(pattern: "light" | "medium" | "heavy" | "success" = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  switch (pattern) {
    case "light": navigator.vibrate(10); break;
    case "medium": navigator.vibrate(25); break;
    case "heavy": navigator.vibrate(60); break;
    case "success": navigator.vibrate([15, 40, 15]); break;
  }
}
