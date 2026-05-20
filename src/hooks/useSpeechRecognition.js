import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognitionImpl =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const speechRecognitionSupported = Boolean(SpeechRecognitionImpl);

/**
 * Continuous speech recognition with silence-based turn detection.
 * - Mic is always on while `listening` is true.
 * - When the caller stops speaking for `silenceMs`, the accumulated
 *   final transcript is committed via `onFinalResult`.
 * - Call `pause()` to halt mic input while the dispatcher TTS is
 *   speaking (prevents the dispatcher's own voice from being echoed
 *   back into the transcript). Call `resume()` afterwards.
 */
export function useSpeechRecognition({
  onFinalResult,
  silenceMs = 1500,
} = {}) {
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const finalTextRef = useRef("");
  const silenceTimerRef = useRef(null);
  const onFinalRef = useRef(onFinalResult);
  const wantRunningRef = useRef(false); // is the call "active and listening"?
  const isPausedRef = useRef(false); // dispatcher speaking → drop final commits

  useEffect(() => {
    onFinalRef.current = onFinalResult;
  }, [onFinalResult]);

  useEffect(() => {
    if (!SpeechRecognitionImpl) return;
    const rec = new SpeechRecognitionImpl();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    const scheduleCommit = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const text = finalTextRef.current.trim();
        if (text && !isPausedRef.current) {
          finalTextRef.current = "";
          setInterim("");
          onFinalRef.current?.(text);
        }
      }, silenceMs);
    };

    rec.onresult = (event) => {
      if (isPausedRef.current) return; // ignore anything during dispatcher TTS

      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTextRef.current += res[0].transcript + " ";
        } else {
          interimText += res[0].transcript;
        }
      }
      setInterim(interimText);
      if (finalTextRef.current.trim() || interimText) {
        scheduleCommit();
      }
    };

    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      console.warn("[stt] error:", e.error, e.message);
      setError(e.error);
    };

    rec.onstart = () => setListening(true);

    rec.onend = () => {
      setListening(false);
      // The browser auto-stops continuous recognition after ~60 s of
      // silence. If the call is still active and not paused, restart.
      if (wantRunningRef.current && !isPausedRef.current) {
        setTimeout(() => {
          if (wantRunningRef.current && !isPausedRef.current) {
            try {
              rec.start();
              setListening(true);
            } catch {
              // already running
            }
          }
        }, 120);
      }
    };

    recognitionRef.current = rec;

    return () => {
      wantRunningRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        rec.abort();
      } catch {
        // ignore
      }
    };
  }, [silenceMs]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    wantRunningRef.current = true;
    isPausedRef.current = false;
    setError(null);
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // already started
    }
  }, []);

  const pause = useCallback(() => {
    isPausedRef.current = true;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    finalTextRef.current = "";
    setInterim("");
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const resume = useCallback(() => {
    if (!recognitionRef.current) return;
    if (!wantRunningRef.current) return;
    isPausedRef.current = false;
    finalTextRef.current = "";
    setInterim("");
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // already running
    }
  }, []);

  const stop = useCallback(() => {
    wantRunningRef.current = false;
    isPausedRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    finalTextRef.current = "";
    setInterim("");
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  return { start, pause, resume, stop, interim, listening, error };
}
