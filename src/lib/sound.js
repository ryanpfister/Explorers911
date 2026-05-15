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

// Returns a stop() function. Simulates CAD keyboard entry while dispatcher is thinking.
export function playTypingLoop() {
  const ac = audioCtx();
  if (!ac) return () => {};
  let active = true;

  function keystroke() {
    if (!active) return;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.016), ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2600 + Math.random() * 1400;
    filter.Q.value = 1.2;
    const g = ac.createGain();
    g.gain.value = 0.04 + Math.random() * 0.03;
    src.connect(filter);
    filter.connect(g);
    g.connect(ac.destination);
    src.start();
    // Occasional longer pauses simulate dispatcher pausing to read/think
    const delay = Math.random() < 0.12
      ? 500 + Math.random() * 700
      : 55 + Math.random() * 120;
    setTimeout(keystroke, delay);
  }

  setTimeout(keystroke, 150 + Math.random() * 250);
  return () => { active = false; };
}

// Radio dispatch tone: signals units being dispatched (brief hold moment).
export function playHoldTone() {
  tone({ freq: 852, duration: 0.2, when: 0, gain: 0.09 });
  tone({ freq: 1209, duration: 0.2, when: 0.28, gain: 0.09 });
  tone({ freq: 852, duration: 0.3, when: 0.58, gain: 0.07 });
}

// Brief two-tone chirp when the call "connects" — like a radio confirming.
export function playConnectChirp() {
  tone({ freq: 1200, duration: 0.07, when: 0, gain: 0.09 });
  tone({ freq: 1800, duration: 0.1, when: 0.09, gain: 0.09 });
}

// Very low call-center hum playing under the call. Returns a stop() function.
export function startAmbience() {
  const ac = audioCtx();
  if (!ac) return () => {};
  const buf = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
  const data = buf.getChannelData(0);
  // Pink-ish noise floor.
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = 0.97 * last + 0.03 * white;
    data[i] = last * 0.5;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 800;
  const g = ac.createGain();
  g.gain.value = 0.025; // very quiet
  src.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  try { src.start(); } catch { return () => {}; }
  return () => {
    try { src.stop(); } catch {}
    try { g.disconnect(); } catch {}
  };
}

// 100 BPM CPR metronome. Returns a stop() function.
export function startCprMetronome(bpm = 100) {
  const ac = audioCtx();
  if (!ac) return () => {};
  let stopped = false;
  const intervalMs = (60 / bpm) * 1000;

  function tick() {
    if (stopped) return;
    tone({ freq: 880, duration: 0.06, gain: 0.15 });
    setTimeout(tick, intervalMs);
  }
  tick();
  return () => { stopped = true; };
}
