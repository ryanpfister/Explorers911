let ctx = null;

function audioCtx() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
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
  // Two short rings, classic phone cadence.
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
