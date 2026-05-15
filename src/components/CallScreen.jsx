import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.js";
import { dispatcherReply } from "../lib/api.js";
import { playEndBeep, playTypingLoop, playHoldTone, playConnectChirp } from "../lib/sound.js";
import { reportAdmin, getSessionId } from "../lib/admin.js";

const END_TAG = "[END_CALL]";
const TRANSFER_TAG = "[TRANSFER]";
const DISPATCH_TAG_RE = /\[DISPATCH:[^\]]+\]/g;
const DISPATCH_RE = /\b(stand by|hold on|dispatching|dispatch|en route|on (?:the|their) way|responding|heading your way|units (?:are|have been)|sending .+(?:fire|ems|ambulance|medic|rescue))\b/i;

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function bubbleLabel(role, agent, mode) {
  if (mode === "dispatcher") {
    return role === "user" ? "You (Dispatcher)" : "Caller";
  }
  if (role === "user") return "You";
  if (agent === "pd") return "SCPD";
  return "Fire Rescue";
}

function bubbleClasses(role, agent, mode) {
  if (role === "user") {
    return mode === "dispatcher"
      ? "bg-sky-600 text-white rounded-br-md"
      : "bg-red-600 text-white rounded-br-md";
  }
  if (agent === "pd") return "bg-blue-900/60 text-stone-100 rounded-bl-md border border-blue-800/60";
  return "bg-stone-800 text-stone-100 rounded-bl-md";
}

export default function CallScreen({ scenario, dispatcher, pd, mode = "caller", onEnd }) {
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [endedReason, setEndedReason] = useState(null);
  // In caller mode: "pd" → "fres" after transfer. In dispatcher mode: always "caller".
  const [agent, setAgent] = useState(mode === "dispatcher" ? "caller" : "pd");
  const scrollRef = useRef(null);
  const endSentinelRef = useRef(null);
  const endedRef = useRef(false);
  const agentRef = useRef(agent);
  useEffect(() => {
    agentRef.current = agent;
  }, [agent]);

  const synth = useSpeechSynthesis({ voiceSeed: (dispatcher?.badge || 0) + (agent === "pd" ? 1 : 0) });
  const messagesRef = useRef(messages);
  const typingStopRef = useRef(null);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sttRef = useRef(null);

  const sendToAI = useCallback(
    async (history) => {
      if (endedRef.current) return;
      sttRef.current?.pause();
      setThinking(true);
      setError(null);
      reportAdmin({ callerStatus: "thinking", messages: history });
      try {
        const { reply } = await dispatcherReply({
          scenarioId: scenario.id,
          messages: history,
          dispatcher,
          pd,
          agent: agentRef.current,
          mode,
          sessionId: getSessionId(),
        });
        const isFinal = reply.includes(END_TAG);
        const isTransfer = reply.includes(TRANSFER_TAG);
        // Strip control tags from what gets shown/spoken.
        let cleaned = reply
          .replace(END_TAG, "")
          .replace(TRANSFER_TAG, "")
          .replace(DISPATCH_TAG_RE, "")
          .trim();

        const stampedAgent = mode === "dispatcher" ? "caller" : agentRef.current;
        const next = [
          ...history,
          { role: "assistant", content: cleaned, agent: stampedAgent },
        ];
        setMessages(next);
        setThinking(false);

        // Hold tone when FRES dispatches units.
        if (mode === "caller" && agentRef.current === "fres" && DISPATCH_RE.test(cleaned)) {
          playHoldTone();
          await new Promise((r) => setTimeout(r, 950));
        }

        reportAdmin({
          callerStatus: "speaking-dispatcher",
          messages: next,
        });
        synth.speak(cleaned, {
          onEnd: () => {
            // PD just transferred — switch to FRES, play tone, fetch FRES opener.
            if (isTransfer && mode === "caller" && agentRef.current === "pd" && !endedRef.current) {
              playHoldTone();
              setTimeout(() => {
                if (endedRef.current) return;
                setAgent("fres");
                agentRef.current = "fres";
                reportAdmin({ agent: "fres" });
                sendToAI(next);
              }, 1500);
              return;
            }
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
    [scenario.id, synth, onEnd, dispatcher, pd, mode]
  );

  const handleFinalTranscript = useCallback(
    (text) => {
      if (endedRef.current) return;
      const next = [...messagesRef.current, { role: "user", content: text }];
      setMessages(next);
      sendToAI(next);
    },
    [sendToAI]
  );

  const stt = useSpeechRecognition({ onFinalResult: handleFinalTranscript });
  sttRef.current = stt;

  // Kick off.
  useEffect(() => {
    playConnectChirp();
    reportAdmin({
      status: "in-call",
      scenarioId: scenario.id,
      mode,
      agent,
      startedAt: Date.now(),
      messages: [],
      interim: "",
      feedback: null,
      emdCode: null,
      dispatch: null,
      endedAt: null,
    });
    stt.start();
    // In caller mode, AI (PD) opens. In dispatcher mode, the kid speaks first.
    if (mode === "caller") {
      sendToAI([]);
    } else {
      reportAdmin({ callerStatus: "listening" });
    }
    return () => stt.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    reportAdmin({ interim: stt.interim });
  }, [stt.interim]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

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
      ? mode === "dispatcher"
        ? "Caller is speaking…"
        : agent === "pd"
          ? "SCPD is speaking…"
          : "Fire Rescue is speaking…"
      : thinking
        ? "Connecting…"
        : stt.listening
          ? mode === "dispatcher"
            ? "Listening — speak as the dispatcher"
            : "Listening — talk normally"
          : "Mic paused";

  const headerTitle =
    mode === "dispatcher"
      ? "FRES Dispatch Console"
      : agent === "pd"
        ? "Suffolk County Police"
        : "Suffolk County Fire Rescue";
  const headerSub =
    mode === "dispatcher"
      ? dispatcher
        ? `You: Dispatcher ${dispatcher.lastName} · #${dispatcher.badge}`
        : "You are the dispatcher"
      : agent === "pd"
        ? pd
          ? `Officer ${pd.lastName} · #${pd.badge}`
          : null
        : dispatcher
          ? `Disp. ${dispatcher.lastName} · #${dispatcher.badge}`
          : null;

  const showHint =
    mode === "dispatcher" && messages.length === 0 && !thinking && !endedReason;

  return (
    <div className="min-h-full flex flex-col max-w-md mx-auto">
      <div className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-stone-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-300 text-[9px] font-bold uppercase tracking-widest">
                REC
              </span>
            </span>
            <div className="text-stone-400 text-xs uppercase tracking-widest truncate">
              {scenario.title}
            </div>
          </div>
          <div className="text-stone-100 text-lg font-bold mt-0.5">
            {headerTitle}
          </div>
          {headerSub && (
            <div className="text-stone-500 text-[11px] font-mono mt-0.5 truncate">
              {headerSub}
            </div>
          )}
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

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {showHint && (
          <div className="rounded-2xl border border-sky-800/60 bg-sky-950/40 text-sky-100 text-sm p-4">
            <div className="text-[10px] uppercase tracking-widest text-sky-300 mb-1.5">
              Pick up the call
            </div>
            <div className="leading-snug">
              You're <span className="font-semibold">Dispatcher {dispatcher?.lastName}</span>. SCPD just conferenced
              in a caller. Greet them — try: <span className="italic">"Suffolk County
              Fire Rescue, Dispatcher {dispatcher?.lastName}, go ahead."</span>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-base leading-snug ${bubbleClasses(m.role, m.agent, mode)}`}
            >
              <div className="text-xs uppercase opacity-70 mb-0.5 tracking-wide">
                {bubbleLabel(m.role, m.agent, mode)}
              </div>
              {m.content}
            </div>
          </div>
        ))}

        {stt.interim && (
          <div className="flex justify-end">
            <div className={`max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-base italic text-white ${mode === "dispatcher" ? "bg-sky-600/40" : "bg-red-600/40"}`}>
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
            title="Interrupt (jump back in)"
          >
            ✋ Interrupt
          </button>
        </div>
        <div className="text-center text-stone-500 text-[11px] mt-3 leading-snug">
          Hold the phone close to your mouth. Headphones help in noisy rooms.
        </div>
      </div>
    </div>
  );
}
