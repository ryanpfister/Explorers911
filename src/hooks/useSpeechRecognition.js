import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognitionImpl =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const speechRecognitionSupported = Boolean(SpeechRecognitionImpl);

export function useSpeechRecognition({ onFinalResult } = {}) {
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const finalTextRef = useRef("");
  const onFinalRef = useRef(onFinalResult);

  useEffect(() => {
    onFinalRef.current = onFinalResult;
  }, [onFinalResult]);

  useEffect(() => {
    if (!SpeechRecognitionImpl) return;
    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
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
    };

    recognition.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setError(e.error);
      }
    };

    recognition.onend = () => {
      setListening(false);
      const final = finalTextRef.current.trim();
      finalTextRef.current = "";
      setInterim("");
      if (final && onFinalRef.current) {
        onFinalRef.current(final);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    setError(null);
    finalTextRef.current = "";
    setInterim("");
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      setError(e.message);
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recognitionRef.current || !listening) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
  }, [listening]);

  const cancel = useCallback(() => {
    if (!recognitionRef.current) return;
    finalTextRef.current = "";
    setInterim("");
    try {
      recognitionRef.current.abort();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  return { start, stop, cancel, interim, listening, error };
}
