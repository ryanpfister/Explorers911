import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.js";
import { dispatcherReply } from "../lib/api.js";
import { playBlip, playEndBeep } from "../lib/sound.js";
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

  // Keep an up-to-date ref of messages so the end-of-speech callback
  // can hand the full transcript to the feedback step.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendToDispatcher = useCallback(
    async (history) => {
      if (endedRef.current) return;
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
        reportAdmin({
          callerStatus: "speaking-dispatcher",
          messages: next,
        });
        synth.speak(cleaned, {
          onEnd: () => {
            reportAdmin({ callerStatus: null });
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
            }
          },
        });
      } catch (e) {
        setThinking(false);
        setError(e.message || "Something went wrong.");
        reportAdmin({ callerStatus: null });
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

  // Initial: announce session to admin, then kick off opener.
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
    sendToDispatcher([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push interim transcripts to admin too, so the projector sees the
  // caller's words live as they speak.
  useEffect(() => {
    reportAdmin({ interim: stt.interim });
  }, [stt.interim]);

  // Call timer.
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll transcript on every change. Use the sentinel div so we
  // pin to the very bottom even when content grows mid-frame.
  useEffect(() => {
    const sentinel = endSentinelRef.current;
    const container = scrollRef.current;
    if (sentinel && container) {
      // requestAnimationFrame avoids racing layout when interim text
      // expands by a single character per frame on Chrome.
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages, thinking, stt.interim]);

  const handleMicDown = useCallback(() => {
    if (endedRef.current || thinking) return;
    if (synth.speaking) synth.stop();
    playBlip();
    reportAdmin({ callerStatus: "listening" });
    stt.start();
  }, [stt, synth, thinking]);

  const handleMicUp = useCallback(() => {
    if (!stt.listening) return;
    stt.stop();
  }, [stt]);

  const handleEnd = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEndedReason("user");
    synth.stop();
    stt.cancel();
    playEndBeep();
    reportAdmin({
      status: "ended",
      endedAt: Date.now(),
      callerStatus: null,
    });
    setTimeout(() => onEnd(messagesRef.current), 400);
  }, [synth, stt, onEnd]);

  return (
    <div className="min-h-full flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-stone-800">
        <div>
          <div className="text-stone-400 text-xs uppercase tracking-widest">
            In Call · {scenario.title}
          </div>
          <div className="text-stone-100 text-lg font-bold mt-0.5">
            Suffolk County 911
          </div>
        </div>
        <div className="flex items-center gap-2">
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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

      {/* Controls */}
      <div className="px-5 pt-3 pb-7 border-t border-stone-800 bg-stone-900">
        <div className="text-center text-stone-400 text-xs mb-3 h-4">
          {endedReason
            ? "Call ended"
            : synth.speaking
              ? "Dispatcher is speaking…"
              : stt.listening
                ? "Listening — release to send"
                : thinking
                  ? "Sending…"
                  : "Hold the mic to talk"}
        </div>
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handleEnd}
            className="flex-1 h-14 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold border border-stone-700"
          >
            End Call
          </button>
          <button
            onPointerDown={handleMicDown}
            onPointerUp={handleMicUp}
            onPointerLeave={handleMicUp}
            onPointerCancel={handleMicUp}
            disabled={!!endedReason || thinking}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl text-white shadow-xl transition ${
              stt.listening
                ? "bg-red-500 scale-110 ring-4 ring-red-400/40"
                : "bg-red-600 hover:bg-red-700"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            aria-label="Hold to talk"
          >
            🎙
          </button>
          <div className="flex-1" />
        </div>
      </div>
    </div>
  );
}
