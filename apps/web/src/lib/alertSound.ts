// The console's alert tone, generated with the Web Audio API, so there's no audio file to load.
//
// Browsers only allow sound after the person has clicked or typed on the page (autoplay policy).
// Signing in counts, so the console can usually sound straight away; after a reload it can't
// until the next click, and the console offers a button for that.

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  context ??= new AudioContext();
  return context;
}

export function soundReady(): boolean {
  return audio()?.state === "running";
}

// Call from a click or key handler: that's when the browser lets the page start audio.
export async function unlockSound(): Promise<boolean> {
  const ctx = audio();
  if (!ctx) return false;
  if (ctx.state !== "running") await ctx.resume().catch(() => undefined);
  return ctx.state === "running";
}

// Unlock on the first interaction anywhere, so a later alert can sound without asking.
export function unlockOnFirstInteraction() {
  const unlock = () => void unlockSound();
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

const PATTERN = {
  // Three rising beeps: the one sound in BantayBuhay that means "act now".
  critical: [880, 990, 1175],
  // Two beeps, lower.
  high: [740, 880],
} as const;

// Plays the tone for a severity. Returns false if the browser hasn't allowed sound yet.
export function playAlert(severity: keyof typeof PATTERN): boolean {
  const ctx = audio();
  if (!ctx || ctx.state !== "running") return false;
  const start = ctx.currentTime + 0.02;
  PATTERN[severity].forEach((frequency, index) => {
    const at = start + index * 0.22;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    // A short envelope avoids clicks; the peak stays moderate in a quiet operations room.
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.2);
  });
  return true;
}

const KEY = "bantaybuhay.alertSound";

export function soundPreference(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function saveSoundPreference(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: the choice still applies for this visit.
  }
}
