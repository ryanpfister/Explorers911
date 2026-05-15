let ctx = null;

function audioCtx() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/**
 * Must be called from a direct user gesture (e.g. a click handler) to
 * unlock the WebAudio context on iOS Safari. Safe to call repeatedly.
 */
export function primeAudio() {
  const ac = audioCtx();
  if (!ac) return;
  // Schedule a silent buffer so iOS commits to keeping the context open.
  try {
    const buffer = ac.createBuffer(1, 1, 22050);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.connect(ac.destination);
    src.start(0);
  } catch {
    // ignore
  }
}

function tone({ freq, duration, when = 0, type = "sine", gain = 0.15 }) {
  const ac = audioCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = 0;
  g.gain.setValueAtTime(0, ac.currentTime + when);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + when + 0.02);
  g.gain.linearRampToValueAtTime(0, ac.currentTime + when + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(ac.currentTime + when);
  osc.stop(ac.currentTime + when + duration + 0.05);
}

export function playRing() {
  for (let i = 0; i < 2; i++) {
    const base = i * 1.0;
    tone({ freq: 480, duration: 0.4, when: base, gain: 0.12 });
    tone({ freq: 440, duration: 0.4, when: base, gain: 0.12 });
  }
}

export function playBlip() {
  tone({ freq: 880, duration: 0.07, gain: 0.08 });
}

export function playEndBeep() {
  tone({ freq: 320, duration: 0.18, gain: 0.1 });
}
