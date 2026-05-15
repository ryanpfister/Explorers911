import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.js";
import { dispatcherReply } from "../lib/api.js";
import { playEndBeep, playTypingLoop, playHoldTone } from "../lib/sound.js";

const DISPATCH_RE = /\b(stand by|hold on|dispatching|dispatch|en route|on (?:the|their) way|responding|heading your way|units (?:are|have been)|sending .+(?:fire|ems|ambulance|medic|rescue))\b/i;
import { reportAdmin } from "../lib/admin.js";

const END_TAG = "[END_CALL]";

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CallScreen({ scenario, onEnd }) {
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [endedReason, setEndedReason] = useState(null);
  const scrollRef = useRef(null);
  const endSentinelRef = useRef(null);
  const endedRef = useRef(false);

  const synth = useSpeechSynthesis();
  const messagesRef = useRef(messages);
  const typingStopRef = useRef(null);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Will be reassigned once useSpeechRecognition runs — but the dispatcher
  // logic needs to reference it via a ref to avoid stale closures.
  const sttRef = useRef(null);

  const sendToDispatcher = useCallback(
    async (history) => {
      if (endedRef.current) return;
      // Mute the mic while we wait + speak so the dispatcher's own voice
      // doesn't get picked up by the kid's phone microphone.
      sttRef.current?.pause();
      setThinking(true);
      setError(null);
      reportAdmin({ callerStatus: "thinking", messages: history });
      try {
        const { reply } = await dispatcherReply({
          scenarioId: scenario.id,
          messages: history,
        });
        const isFinal = reply.includes(END_TAG);
        const cleaned = reply.replace(END_TAG, "").trim();
        const next = [...history, { role: "assistant", content: cleaned }];
        setMessages(next);
        setThinking(false);

        // Play radio dispatch tone when units are sent, then wait for it to finish.
        if (DISPATCH_RE.test(cleaned)) {
          playHoldTone();
          await new Promise((r) => setTimeout(r, 950));
        }

        reportAdmin({
          callerStatus: "speaking-dispatcher",
          messages: next,
        });
        synth.speak(cleaned, {
          onEnd: () => {
            if (isFinal && !endedRef.current) {
              endedRef.current = true;
              setEndedReason("dispatched");
              playEndBeep();
              reportAdmin({
                status: "ended",
                endedAt: Date.now(),
                callerStatus: null,
              });
              setTimeout(() => onEnd(messagesRef.current), 1200);
              return;
            }
            // Dispatcher finished — open the mic back up for the caller.
            reportAdmin({ callerStatus: "listening" });
            sttRef.current?.resume();
          },
        });
      } catch (e) {
        setThinking(false);
        setError(e.message || "Something went wrong.");
        reportAdmin({ callerStatus: "listening" });
        sttRef.current?.resume();
      }
    },
    [scenario.id, synth, onEnd]
  );

  const handleFinalTranscript = useCallback(
    (text) => {
      if (endedRef.current) return;
      const next = [...messagesRef.current, { role: "user", content: text }];
      setMessages(next);
      sendToDispatcher(next);
    },
    [sendToDispatcher]
  );

  const stt = useSpeechRecognition({ onFinalResult: handleFinalTranscript });
  sttRef.current = stt;

  // Kick off: announce session, fetch the opener, start listening.
  useEffect(() => {
    reportAdmin({
      status: "in-call",
      scenarioId: scenario.id,
      startedAt: Date.now(),
      messages: [],
      interim: "",
      feedback: null,
      emdCode: null,
      endedAt: null,
    });
    stt.start();
    sendToDispatcher([]);
    return () => stt.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start/stop CAD typing sounds while waiting for dispatcher reply.
  useEffect(() => {
    if (thinking) {
      typingStopRef.current = playTypingLoop();
    } else {
      typingStopRef.current?.();
      typingStopRef.current = null;
    }
    return () => {
      typingStopRef.current?.();
      typingStopRef.current = null;
    };
  }, [thinking]);

  // Stream interim transcripts to admin so the projector can show
  // the kid's words in real time.
  useEffect(() => {
    reportAdmin({ interim: stt.interim });
  }, [stt.interim]);

  // Call timer.
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [messages, thinking, stt.interim]);

  const handleEnd = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEndedReason("user");
    synth.stop();
    stt.stop();
    playEndBeep();
    reportAdmin({
      status: "ended",
      endedAt: Date.now(),
      callerStatus: null,
    });
    setTimeout(() => onEnd(messagesRef.current), 400);
  }, [synth, stt, onEnd]);

  const handleInterrupt = useCallback(() => {
    if (!synth.speaking) return;
    synth.stop();
    reportAdmin({ callerStatus: "listening" });
    stt.resume();
  }, [synth, stt]);

  const status = endedReason
    ? "Call ended"
    : synth.speaking
      ? "Dispatcher is speaking…"
      : thinking
        ? "Sending to dispatcher…"
        : stt.listening
          ? "Listening — talk normally"
          : "Mic paused";

  return (
    <div className="min-h-full flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-stone-800">
        <div className="min-w-0">
          <div className="text-stone-400 text-xs uppercase tracking-widest truncate">
            In Call · {scenario.title}
          </div>
          <div className="text-stone-100 text-lg font-bold mt-0.5">
            Suffolk County 911
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              synth.speaking
                ? "bg-green-400 animate-pulse-slow"
                : stt.listening
                  ? "bg-red-500 animate-pulse-slow"
                  : "bg-stone-600"
            }`}
          />
          <span className="text-stone-300 font-mono text-sm tabular-nums">
            {formatTimer(elapsed)}
          </span>
        </div>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-base leading-snug ${
                m.role === "user"
                  ? "bg-red-600 text-white rounded-br-md"
                  : "bg-stone-800 text-stone-100 rounded-bl-md"
              }`}
            >
              <div className="text-xs uppercase opacity-70 mb-0.5 tracking-wide">
                {m.role === "user" ? "You" : "Dispatcher"}
              </div>
              {m.content}
            </div>
          </div>
        ))}

        {stt.interim && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-base bg-red-600/40 text-white italic">
              {stt.interim}
            </div>
          </div>
        )}

        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-stone-800 text-stone-400 text-sm">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-500 animate-bounce" />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-stone-500 animate-bounce"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-stone-500 animate-bounce"
                  style={{ animationDelay: "0.3s" }}
                />
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 text-red-200 text-sm p-3">
            {error}
          </div>
        )}

        <div ref={endSentinelRef} />
      </div>

      {/* Status + controls */}
      <div className="px-5 pt-3 pb-7 border-t border-stone-800 bg-stone-900">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div
            className={`w-3 h-3 rounded-full ${
              stt.listening
                ? "bg-red-500 animate-pulse-slow"
                : synth.speaking
                  ? "bg-green-400 animate-pulse-slow"
                  : "bg-stone-600"
            }`}
          />
          <div className="text-stone-300 text-sm font-medium">{status}</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleEnd}
            className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg shadow-lg"
          >
            End Call
          </button>
          <button
            onClick={handleInterrupt}
            disabled={!synth.speaking}
            className="h-14 px-5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold border border-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Interrupt dispatcher (jump back in)"
          >
            ✋ Interrupt
          </button>
        </div>
        <div className="text-center text-stone-500 text-[11px] mt-3 leading-snug">
          For best results, hold the phone close to your mouth.
          Headphones help in noisy rooms.
        </div>
      </div>
    </div>
  );
}
