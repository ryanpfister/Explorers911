import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function PhoneIcon({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.05-.24 11.36 11.36 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.58 1 1 0 01-.25 1.05l-2.2 2.2z" />
    </svg>
  );
}

export default function CallScreen({ scenario, dispatcher, pd, mode = "caller", onEnd }) {
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [endedReason, setEndedReason] = useState(null);
  const [agent, setAgent] = useState(mode === "dispatcher" ? "caller" : "pd");
  const [showTranscript, setShowTranscript] = useState(false);
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

        if (mode === "caller" && agentRef.current === "fres" && DISPATCH_RE.test(cleaned)) {
          playHoldTone();
          await new Promise((r) => setTimeout(r, 950));
        }

        reportAdmin({ callerStatus: "speaking-dispatcher", messages: next });
        synth.speak(cleaned, {
          onEnd: () => {
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
              reportAdmin({ status: "ended", endedAt: Date.now(), callerStatus: null });
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

  const handleEnd = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEndedReason("user");
    synth.stop();
    stt.stop();
    playEndBeep();
    reportAdmin({ status: "ended", endedAt: Date.now(), callerStatus: null });
    setTimeout(() => onEnd(messagesRef.current), 400);
  }, [synth, stt, onEnd]);

  const handleInterrupt = useCallback(() => {
    if (!synth.speaking) return;
    synth.stop();
    reportAdmin({ callerStatus: "listening" });
    stt.resume();
  }, [synth, stt]);

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant"),
    [messages]
  );
  const latestUser = useMemo(
    () => [...messages].reverse().find((m) => m.role === "user"),
    [messages]
  );

  const status = endedReason
    ? "Call ended"
    : synth.speaking
      ? mode === "dispatcher"
        ? "Caller speaking…"
        : agent === "pd"
          ? "SCPD speaking…"
          : "Fire Rescue speaking…"
      : thinking
        ? "Connecting…"
        : stt.listening
          ? mode === "dispatcher"
            ? "Listening — speak as dispatcher"
            : "Listening — talk normally"
          : "Mic paused";

  const headerTitle =
    mode === "dispatcher"
      ? "FRES Dispatch Console"
      : agent === "pd"
        ? "Suffolk County 911"
        : "Suffolk County Fire Rescue";

  const headerSub =
    mode === "dispatcher"
      ? dispatcher
        ? `Disp. ${dispatcher.lastName} #${dispatcher.badge} (you)`
        : "You are the dispatcher"
      : agent === "pd"
        ? pd
          ? `Officer ${pd.lastName} #${pd.badge}`
          : "Police Dispatch"
        : dispatcher
          ? `Disp. ${dispatcher.lastName} #${dispatcher.badge}`
          : "Fire Rescue";

  const avatarLabel = mode === "dispatcher" ? "FRES" : "911";
  const avatarColor =
    mode === "dispatcher"
      ? "from-sky-700 to-sky-900 border-sky-600 text-sky-200"
      : agent === "pd"
        ? "from-blue-800 to-blue-950 border-blue-700 text-blue-200"
        : "from-stone-800 to-stone-950 border-stone-700 text-red-400";

  const showDispatcherHint =
    mode === "dispatcher" && messages.length === 0 && !thinking && !endedReason;

  return (
    <div className="min-h-full flex flex-col max-w-md mx-auto relative bg-gradient-to-b from-stone-900 via-stone-950 to-black text-stone-100">
      {/* Status bar */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between text-[11px] font-mono text-stone-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-300 font-bold tracking-widest">REC</span>
        </span>
        <span className="text-stone-400 truncate max-w-[50%] text-center text-[10px] uppercase tracking-widest">
          {scenario.title}
        </span>
        <span className="tabular-nums">{formatTimer(elapsed)}</span>
      </div>

      {/* Phone "call screen" */}
      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-4">
        <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${avatarColor} border-4 flex items-center justify-center text-3xl font-black shadow-2xl mb-5`}>
          {avatarLabel}
        </div>

        <div className="text-stone-100 text-2xl font-bold text-center leading-tight">
          {headerTitle}
        </div>
        <div className="text-stone-400 text-sm mt-1 font-mono text-center">
          {headerSub}
        </div>
        <div className="text-stone-500 text-xs mt-2 tabular-nums">
          {formatTimer(elapsed)}
        </div>

        <div className="mt-5 px-4 py-1.5 rounded-full bg-stone-800/70 border border-stone-700/80 inline-flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              synth.speaking
                ? "bg-green-400 animate-pulse"
                : stt.listening
                  ? "bg-red-500 animate-pulse"
                  : "bg-stone-500"
            }`}
          />
          <span className="text-stone-300 text-xs font-medium">{status}</span>
        </div>

        {/* Live captions */}
        <div className="w-full mt-6 space-y-3">
          {showDispatcherHint && (
            <div className="rounded-2xl border border-sky-800/60 bg-sky-950/40 text-sky-100 text-sm p-4">
              <div className="text-[10px] uppercase tracking-widest text-sky-300 mb-1.5">
                Pick up the call
              </div>
              <div className="leading-snug">
                You're <span className="font-semibold">Dispatcher {dispatcher?.lastName}</span>. Greet the caller — try: <span className="italic">"Suffolk County Fire Rescue, Dispatcher {dispatcher?.lastName}, go ahead."</span>
              </div>
            </div>
          )}

          {latestAssistant && (
            <CaptionBubble
              label={
                mode === "dispatcher"
                  ? "Caller"
                  : latestAssistant.agent === "pd"
                    ? "SCPD"
                    : "Fire Rescue"
              }
              tone={latestAssistant.agent === "pd" ? "pd" : mode === "dispatcher" ? "caller" : "fres"}
              text={latestAssistant.content}
              speaking={synth.speaking}
            />
          )}

          {(latestUser || stt.interim) && (
            <CaptionBubble
              label={mode === "dispatcher" ? "You (Dispatcher)" : "You"}
              tone="you"
              text={stt.interim || latestUser?.content || ""}
              interim={!!stt.interim}
              align="right"
            />
          )}

          {thinking && (
            <div className="flex justify-center pt-2">
              <div className="rounded-full px-4 py-2 bg-stone-800/70 border border-stone-700/80">
                <span className="inline-flex gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-500 animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-500 animate-bounce" style={{ animationDelay: "0.3s" }} />
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/50 text-red-200 text-sm p-3">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* iPhone-style controls */}
      <div className="px-6 pb-10 pt-2">
        <div className="flex items-center justify-around mb-6">
          <ControlButton
            label="Interrupt"
            icon="✋"
            disabled={!synth.speaking}
            onClick={handleInterrupt}
          />
          <ControlButton
            label={showTranscript ? "Hide log" : "Transcript"}
            icon="📝"
            onClick={() => setShowTranscript((s) => !s)}
          />
          <ControlButton
            label={stt.listening ? "Mic on" : "Mic"}
            icon={stt.listening ? "🎙️" : "🔇"}
            active={stt.listening}
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleEnd}
            className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition shadow-2xl shadow-red-900/50 flex items-center justify-center text-white"
            aria-label="End call"
          >
            <PhoneIcon className="w-8 h-8 rotate-[135deg]" />
          </button>
        </div>
        <div className="text-center text-stone-300 text-sm mt-3 font-medium">
          End Call
        </div>
      </div>

      {/* Transcript drawer */}
      {showTranscript && (
        <div
          className="fixed inset-0 bg-black/70 z-30 flex items-end sm:items-center justify-center"
          onClick={() => setShowTranscript(false)}
        >
          <div
            className="bg-stone-900 border-t sm:border border-stone-700 w-full sm:max-w-md sm:rounded-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-stone-800 flex items-center justify-between">
              <div className="font-bold text-stone-100">Call Transcript</div>
              <button
                onClick={() => setShowTranscript(false)}
                className="text-stone-400 hover:text-stone-100 text-sm"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                      m.role === "user"
                        ? mode === "dispatcher"
                          ? "bg-sky-600 text-white rounded-br-md"
                          : "bg-red-600 text-white rounded-br-md"
                        : m.agent === "pd"
                          ? "bg-blue-900/70 text-stone-100 rounded-bl-md border border-blue-800/60"
                          : "bg-stone-800 text-stone-100 rounded-bl-md"
                    }`}
                  >
                    <div className="text-[10px] uppercase opacity-70 mb-0.5 tracking-widest">
                      {m.role === "user"
                        ? mode === "dispatcher" ? "You (Dispatcher)" : "You"
                        : m.agent === "pd"
                          ? "SCPD"
                          : mode === "dispatcher" ? "Caller" : "Fire Rescue"}
                    </div>
                    {m.content}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-stone-500 text-sm text-center py-8">
                  Nothing yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CaptionBubble({ label, text, tone, speaking, interim, align = "left" }) {
  const toneClasses =
    tone === "pd"
      ? "bg-blue-950/60 border-blue-800/60 text-blue-100"
      : tone === "fres"
        ? "bg-stone-800/80 border-stone-700 text-stone-100"
        : tone === "caller"
          ? "bg-stone-800/80 border-stone-700 text-stone-100"
          : "bg-red-950/40 border-red-800/50 text-red-50";

  return (
    <div className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-2xl px-4 py-2.5 border ${toneClasses} ${speaking ? "ring-1 ring-green-400/40" : ""} ${interim ? "opacity-70 italic" : ""} max-w-[88%]`}
      >
        <div className="text-[10px] uppercase tracking-widest opacity-70 mb-0.5">
          {label}
        </div>
        <div className="text-[15px] leading-snug">{text}</div>
      </div>
    </div>
  );
}

function ControlButton({ icon, label, onClick, disabled, active }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-14 h-14 rounded-full border flex items-center justify-center text-2xl transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
          active
            ? "bg-stone-100 text-stone-900 border-stone-100"
            : "bg-stone-800/80 hover:bg-stone-700 border-stone-700 text-stone-100"
        }`}
      >
        {icon}
      </button>
      <span className="text-[10px] text-stone-400 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
