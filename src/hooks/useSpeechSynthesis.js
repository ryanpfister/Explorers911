import { useCallback, useEffect, useRef, useState } from "react";

export const speechSynthesisSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

function pickDispatcherVoice(voices) {
  if (!voices || voices.length === 0) return null;
  const english = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
  const pool = english.length ? english : voices;
  // Prefer calm, professional female-sounding voices when available.
  const preferred = [
    "Google US English",
    "Samantha",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Microsoft Jenny Online (Natural) - English (United States)",
    "Karen",
    "Victoria",
  ];
  for (const name of preferred) {
    const match = pool.find((v) => v.name === name);
    if (match) return match;
  }
  const female = pool.find((v) => /female|samantha|victoria|karen|aria|jenny|zira/i.test(v.name));
  return female || pool[0];
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
    window.speechSynthesis.speak(utter);
  }, []);

  const stop = useCallback(() => {
    if (!speechSynthesisSupported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking };
}
