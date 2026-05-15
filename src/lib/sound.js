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
    // Fast CAD entry — dispatchers are quick on the keyboard.
    const delay = Math.random() < 0.06
      ? 200 + Math.random() * 350
      : 25 + Math.random() * 65;
    setTimeout(keystroke, delay);
  }

  setTimeout(keystroke, 60 + Math.random() * 120);
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

// Hectic call-center ambience — pink-ish noise floor + occasional distant
// sirens + faint garbled radio chatter. Returns a combined stop() function.
function playDistantSiren() {
  const ac = audioCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  // Two slow wail cycles.
  osc.frequency.setValueAtTime(700, ac.currentTime);
  osc.frequency.linearRampToValueAtTime(1100, ac.currentTime + 1.0);
  osc.frequency.linearRampToValueAtTime(700, ac.currentTime + 2.0);
  osc.frequency.linearRampToValueAtTime(1100, ac.currentTime + 3.0);
  g.gain.setValueAtTime(0, ac.currentTime);
  g.gain.linearRampToValueAtTime(0.02, ac.currentTime + 0.3);
  g.gain.linearRampToValueAtTime(0, ac.currentTime + 3.5);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 3.6);
}

function playRadioChatter() {
  const ac = audioCtx();
  if (!ac) return;
  const duration = 1.2 + Math.random() * 1.5;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * duration), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / ac.sampleRate;
    // Modulated noise with rough "speech-like" envelope.
    const env = 0.4 + 0.6 * Math.abs(Math.sin(t * 12));
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1400 + Math.random() * 400;
  filter.Q.value = 8;
  const g = ac.createGain();
  g.gain.value = 0.022;
  src.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  try { src.start(); } catch {}
}

export function startAmbience() {
  const ac = audioCtx();
  if (!ac) return () => {};

  // Pink-ish noise floor.
  const buf = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
  const data = buf.getChannelData(0);
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
  g.gain.value = 0.03;
  src.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  try { src.start(); } catch { return () => {}; }

  // Occasional distant siren wails.
  const sirenInterval = setInterval(() => {
    if (Math.random() < 0.35) playDistantSiren();
  }, 22000);
  // After 8s, play one right away.
  const firstSiren = setTimeout(() => playDistantSiren(), 8000);

  // Distant radio chatter bursts.
  const chatterInterval = setInterval(() => {
    if (Math.random() < 0.5) playRadioChatter();
  }, 14000);
  const firstChatter = setTimeout(() => playRadioChatter(), 4000);

  return () => {
    try { src.stop(); } catch {}
    try { g.disconnect(); } catch {}
    clearInterval(sirenInterval);
    clearInterval(chatterInterval);
    clearTimeout(firstSiren);
    clearTimeout(firstChatter);
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
