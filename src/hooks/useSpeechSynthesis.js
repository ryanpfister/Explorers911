import { useCallback, useEffect, useRef, useState } from "react";

export const speechSynthesisSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

function pickDispatcherVoice(voices) {
  if (!voices || voices.length === 0) return null;
  const english = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
  const pool = english.length ? english : voices;
  const preferred = [
    "Samantha", // macOS / iOS Safari default — high quality
    "Google US English",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Microsoft Jenny Online (Natural) - English (United States)",
    "Karen",
    "Victoria",
    "Allison",
  ];
  for (const name of preferred) {
    const match = pool.find((v) => v.name === name);
    if (match) return match;
  }
  const female = pool.find((v) =>
    /female|samantha|victoria|karen|aria|jenny|zira|allison/i.test(v.name)
  );
  return female || pool[0];
}

/**
 * Must be called from a direct user gesture (e.g. a click handler) to
 * unlock speech synthesis on iOS Safari. Triggers a near-silent
 * utterance to commit the audio output stream. Safe to call repeatedly.
 */
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

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef(null);
  const onEndRef = useRef(null);

  useEffect(() => {
    if (!speechSynthesisSupported) return;
    const updateVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current = pickDispatcherVoice(voices);
    };
    updateVoice();
    window.speechSynthesis.onvoiceschanged = updateVoice;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text, { onEnd } = {}) => {
    if (!speechSynthesisSupported || !text) {
      onEnd?.();
      return;
    }
    // Re-pick the voice in case voices loaded after first render (Safari).
    if (!voiceRef.current) {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current = pickDispatcherVoice(voices);
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) utter.voice = voiceRef.current;
    utter.rate = 1.0;
    utter.pitch = 1.0;
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
    // Safari sometimes drops the first speak() if invoked too quickly
    // after cancel(); a microtask defer makes it reliable.
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
