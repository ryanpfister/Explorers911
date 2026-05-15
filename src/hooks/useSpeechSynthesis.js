import { useCallback, useEffect, useRef, useState } from "react";

export const speechSynthesisSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

// Rank every available voice. Higher = better. Picks the most modern /
// neural voice the browser exposes on this device.
function rankVoice(v) {
  const name = v.name || "";
  const lang = v.lang || "";
  let score = 0;
  // Tier 1: Microsoft Online "Natural" (neural) voices in Edge
  if (/Microsoft.+Online.+\(Natural\)/i.test(name)) score += 1000;
  if (/\(Natural\)/i.test(name)) score += 900;
  // Tier 2: iOS premium / enhanced / Siri voices
  if (/\(Premium\)/i.test(name)) score += 850;
  if (/Siri/i.test(name)) score += 800;
  if (/\(Enhanced\)/i.test(name)) score += 750;
  // Tier 3: Google Cloud TTS voices (Chrome desktop, Android)
  if (/^Google.*\bUS English\b/i.test(name)) score += 650;
  if (/^Google.*\bUK English\b.*Female/i.test(name)) score += 600;
  if (/^Google.*English/i.test(name)) score += 500;
  // Tier 4: solid named voices
  if (/^Samantha\b/i.test(name)) score += 450;
  if (/Aria|Jenny|Ava|Emma/i.test(name)) score += 400;
  if (/Allison|Victoria|Karen|Moira|Tessa/i.test(name)) score += 300;
  // Hint: prefer female-sounding voices (calmer dispatcher cadence)
  if (/female/i.test(name)) score += 100;
  // Tier 5: any Microsoft / Google voice
  if (/^Microsoft\b/i.test(name)) score += 80;
  if (/^Google\b/i.test(name)) score += 60;
  // Accent bonus
  if (/^en-US/i.test(lang)) score += 50;
  if (/^en-GB/i.test(lang)) score += 30;
  if (/^en/i.test(lang)) score += 10;
  // Local voices preferred when present
  if (v.localService) score += 5;
  return score;
}

function pickDispatcherVoice(voices, seed = 0) {
  if (!voices || voices.length === 0) return null;
  const en = voices.filter((v) => v.lang && /^en/i.test(v.lang));
  const pool = en.length ? en : voices;
  const ranked = [...pool].sort((a, b) => rankVoice(b) - rankVoice(a));
  // Rotate among the top voices so each call gets a different dispatcher.
  const topN = Math.min(3, ranked.length);
  if (topN === 0) return null;
  const idx = ((seed % topN) + topN) % topN;
  return ranked[idx] || ranked[0];
}

export function primeSpeechSynthesis() {
  if (!speechSynthesisSupported) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0.01;
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

export function useSpeechSynthesis({ voiceSeed = 0 } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef(null);
  const onEndRef = useRef(null);

  useEffect(() => {
    if (!speechSynthesisSupported) return;
    const updateVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current = pickDispatcherVoice(voices, voiceSeed);
    };
    updateVoice();
    window.speechSynthesis.onvoiceschanged = updateVoice;
    // Some browsers populate the list asynchronously; re-check shortly.
    const t = setTimeout(updateVoice, 250);
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      clearTimeout(t);
    };
  }, [voiceSeed]);

  const speak = useCallback((text, { onEnd } = {}) => {
    if (!speechSynthesisSupported || !text) {
      onEnd?.();
      return;
    }
    if (!voiceRef.current) {
      voiceRef.current = pickDispatcherVoice(window.speechSynthesis.getVoices());
    }

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) utter.voice = voiceRef.current;
    // Slightly slower + slightly lower pitch = professional dispatcher cadence
    utter.rate = 0.95;
    utter.pitch = 0.95;
    utter.volume = 1.0;
    onEndRef.current = onEnd || null;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => {
      setSpeaking(false);
      onEndRef.current?.();
    };
    utter.onerror = () => {
      setSpeaking(false);
      onEndRef.current?.();
    };
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utter);
      } catch {
        setSpeaking(false);
        onEndRef.current?.();
      }
    }, 30);
  }, []);

  const stop = useCallback(() => {
    if (!speechSynthesisSupported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking };
}
