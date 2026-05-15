import React, { useEffect, useMemo, useRef, useState } from "react";
import { scenarioById, difficultyColor } from "../scenarios.js";
import { resetAdmin, deleteSession } from "../lib/admin.js";
import ReviewScreen from "./ReviewScreen.jsx";

const PHONETIC = {
  A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo",
  F: "Foxtrot", G: "Golf", H: "Hotel", I: "India", J: "Juliet",
  K: "Kilo", L: "Lima", M: "Mike", N: "November", O: "Oscar",
  P: "Papa", Q: "Quebec", R: "Romeo", S: "Sierra", T: "Tango",
  U: "Uniform", V: "Victor", W: "Whiskey", X: "Xray", Y: "Yankee", Z: "Zulu",
};

function phoneticCode(code) {
  if (!code) return "";
  return code
    .toUpperCase()
    .split("")
    .map((c) => {
      if (PHONETIC[c]) return ` ${PHONETIC[c]} `;
      if (c === "-") return " ";
      return c;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDispatchTime(ts) {
  const d = new Date(ts || Date.now());
  return `${d.getHours().toString().padStart(2, "0")}${d.getMinutes().toString().padStart(2, "0")} hours`;
}

function buildAnnouncementText(d) {
  const ageStr =
    d.age && d.age !== "unknown" && d.age !== ""
      ? `for a ${d.age} year old patient`
      : "for a patient";
  const codePart = d.code ? `, code ${phoneticCode(d.code)}` : "";
  const nature = d.nature ? `, ${d.nature}, ` : ", ";
  return `${d.department || "Suffolk County Fire Rescue"}, on the air with an EMS alarm${codePart}${nature}${ageStr} at ${d.location || "an unknown location"}. Time is now ${formatDispatchTime(d.timestamp)}.`;
}

// Heuristic EMD coverage detection — scans all transcript messages and flags which protocol steps were covered.
const EMD_STEPS = [
  { id: "location", label: "Location", icon: "📍",
    test: (caller) => /\b(\d+ ?\w+ (street|st|ave|avenue|road|rd|blvd|lane|ln|dr|drive|way|highway|hwy|park|court|ct)|patchogue|bay shore|smithtown|brentwood|sayville|riverhead|babylon|hauppauge|east islip|huntington|commack|middle island|holbrook|west islip|selden|mastic|robert moses|main\b|\bcorner of\b|\bintersection of\b)/i.test(caller) },
  { id: "callback", label: "Callback #", icon: "📞",
    test: (caller) => /\b\d{3}[-. ]?\d{3}[-. ]?\d{4}\b|six three one|callback|phone (?:number|is)/i.test(caller) },
  { id: "complaint", label: "Chief complaint", icon: "🆘",
    test: (caller) => /\b(can't breathe|not breathing|choking|chest pain|bleeding|cut|burning|fire|smoke|drowning|stroke|seizure|seizing|unconscious|passed out|collapsed|heart attack|allergic|stung|crash|hit by|hit and run|wreck|fell|fall|epi|diabetic|asthma|inhaler|co|carbon monoxide)/i.test(caller) },
  { id: "age", label: "Age", icon: "🎂",
    test: (caller) => /\b(\d{1,3})[- ]?(year[- ]old|years old|yo)\b|she'?s (?:\d{1,3})|he'?s (?:\d{1,3})|grandma|grandpa|sister|brother|mom|mother|dad|father|friend|teammate|aunt|uncle/i.test(caller) },
  { id: "awake", label: "Awake?", icon: "👁",
    test: (caller, dispatcher) => /\b(awake|conscious|responsive|talking|alert|won'?t wake|unresponsive|out cold|knocked out|passed out|unconscious|not moving|not respond)/i.test(caller) || /\bawake|conscious|responsive\b/i.test(dispatcher) },
  { id: "breathing", label: "Breathing?", icon: "🫁",
    test: (caller, dispatcher) => /\b(breath|wheezing|gasping|not breathing|can'?t breathe|short of breath|labored)/i.test(caller) || /\bbreathing\b/i.test(dispatcher) },
  { id: "dispatch", label: "Units dispatched", icon: "🚒",
    test: (_caller, dispatcher) => /\b(sending|dispatching|dispatched|on the way|on their way|en route|responding|heading your way|got .+ (?:fire|ems|ambulance|medic))/i.test(dispatcher) },
  { id: "prearrival", label: "Pre-arrival inst.", icon: "💉",
    test: (_caller, dispatcher) => /\b(compress|cpr|push down|stayin'? alive|direct pressure|press (?:a |the )?(?:cloth|towel)|back blow|epipen|cool water|get outside|don'?t go back|don'?t move|keep (?:them|her|him) still)/i.test(dispatcher) },
];

function computeEmdCoverage(messages) {
  const callerText = (messages || [])
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
  const dispatcherText = (messages || [])
    .filter((m) => m.role === "assistant")
    .map((m) => m.content)
    .join(" ");
  return EMD_STEPS.map((s) => ({ ...s, done: s.test(callerText, dispatcherText) }));
}

function speakAnnouncement(text) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.1;
  u.pitch = 1.0;
  u.volume = 1.0;
  window.speechSynthesis.speak(u);
}

// Suffolk County FRES uses Plectron-style two-tone alerting before voice dispatch.
// Two pure sine tones (~700Hz and ~1000Hz), the second one longer.
function playAlertTones() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  const ac = new Ctor();
  if (ac.state === "suspended") ac.resume().catch(() => {});

  function tone(freq, start, duration, gain = 0.18) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, ac.currentTime + start);
    g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.02);
    g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + duration - 0.05);
    g.gain.linearRampToValueAtTime(0, ac.currentTime + start + duration);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(ac.currentTime + start);
    osc.stop(ac.currentTime + start + duration + 0.05);
  }

  tone(700, 0, 1.0);
  tone(1000, 1.05, 2.2);
  return 3300; // total ms — caller waits this long before speaking
}

async function announceDispatch(d) {
  const waitMs = playAlertTones() || 0;
  await new Promise((r) => setTimeout(r, waitMs + 200));
  speakAnnouncement(buildAnnouncementText(d));
}

function formatTimer(ms) {
  if (!ms || ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function statusBadge(s) {
  if (s.status === "ringing") return { label: "Ringing", cls: "bg-amber-700/40 text-amber-200 border-amber-700/60" };
  if (s.status === "in-call") {
    if (s.callerStatus === "speaking-dispatcher")
      return { label: "Dispatcher", cls: "bg-emerald-700/40 text-emerald-200 border-emerald-700/60" };
    if (s.callerStatus === "listening")
      return { label: "🎙 Caller", cls: "bg-red-700/40 text-red-200 border-red-700/60" };
    if (s.callerStatus === "thinking")
      return { label: "…", cls: "bg-stone-700/60 text-stone-200 border-stone-600" };
    return { label: "Live", cls: "bg-red-700/40 text-red-200 border-red-700/60" };
  }
  if (s.status === "ended") return { label: "Ended", cls: "bg-stone-700/60 text-stone-300 border-stone-600" };
  if (s.status === "feedback-ready")
    return { label: "Reviewed", cls: "bg-sky-700/40 text-sky-200 border-sky-700/60" };
  return { label: "Idle", cls: "bg-stone-800 text-stone-400 border-stone-700" };
}

function parseFeedbackSection(text, label) {
  if (!text) return "";
  const re = new RegExp(`^${label}\\s*:\\s*(.+)$`, "im");
  const m = text.match(re);
  return m ? m[1].trim() : "";
}

function parseFeedbackList(text, label, nextLabels) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const startIdx = lines.findIndex((l) =>
    new RegExp(`^${label}\\s*:?`, "i").test(l.trim())
  );
  if (startIdx < 0) return [];
  const items = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (nextLabels.some((l) => new RegExp(`^${l}\\s*:?`, "i").test(trimmed))) break;
    if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
      items.push(trimmed.replace(/^[-•]\s*/, ""));
    }
  }
  return items;
}

function SessionCard({ s, onSelect, now }) {
  const scenario = s.scenarioId ? scenarioById(s.scenarioId) : null;
  const badge = statusBadge(s);
  const elapsedMs = s.startedAt
    ? (s.endedAt || now) - s.startedAt
    : 0;
  const coverage = computeEmdCoverage(s.messages);
  const doneCount = coverage.filter((c) => c.done).length;
  const lastDispatcher = [...(s.messages || [])]
    .reverse()
    .find((m) => m.role === "assistant");
  const lastCaller = [...(s.messages || [])]
    .reverse()
    .find((m) => m.role === "user");

  return (
    <button
      onClick={onSelect}
      className="text-left rounded-2xl bg-stone-900 border border-stone-800 hover:border-stone-600 transition p-5 flex flex-col gap-3 min-h-[260px]"
    >
      <div className="flex items-start gap-3">
        <div className="text-4xl shrink-0" aria-hidden>
          {scenario?.emoji || "📞"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-stone-100 text-xl font-bold leading-tight truncate">
            {scenario?.title || "Unknown scenario"}
          </div>
          <div className="text-stone-500 text-xs truncate">
            {scenario?.location || "—"}
          </div>
        </div>
        <span
          className={`shrink-0 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span className="text-stone-400 font-mono tabular-nums">
          {formatTimer(elapsedMs)}
        </span>
        {scenario && (
          <span
            className={`uppercase tracking-widest px-1.5 py-0.5 rounded border text-[10px] ${difficultyColor(
              scenario.difficulty
            )}`}
          >
            {scenario.difficulty}
          </span>
        )}
        {s.callerName && (
          <span className="text-stone-300 truncate">{s.callerName}</span>
        )}
        <span className="font-mono text-stone-500 truncate">
          {s.emdCode || `→ ${s.expectedEmdCode || "—"}`}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1 text-[10px]">
        {coverage.map((c) => (
          <div
            key={c.id}
            className={`rounded border px-1.5 py-1 flex items-center gap-1 truncate ${
              c.done
                ? "bg-emerald-900/40 border-emerald-700/60 text-emerald-200"
                : "bg-stone-800/60 border-stone-700/60 text-stone-500"
            }`}
            title={c.label}
          >
            <span>{c.done ? "✓" : c.icon}</span>
            <span className="truncate">{c.label}</span>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-stone-500">
        EMD coverage {doneCount}/{coverage.length}
      </div>

      <div className="space-y-1.5 text-sm flex-1 min-h-0 overflow-hidden">
        {lastDispatcher && (
          <div className="text-stone-300 line-clamp-2">
            <span className="text-stone-500 text-[10px] uppercase tracking-wider mr-1">
              Disp
            </span>
            {lastDispatcher.content}
          </div>
        )}
        {lastCaller && (
          <div className="text-red-200 line-clamp-2">
            <span className="text-stone-500 text-[10px] uppercase tracking-wider mr-1">
              Caller
            </span>
            {lastCaller.content}
          </div>
        )}
        {s.interim && (
          <div className="text-red-300/80 italic line-clamp-1">
            {s.interim}…
          </div>
        )}
        {!lastDispatcher && !lastCaller && !s.interim && (
          <div className="text-stone-600 italic text-xs">
            Waiting for the caller…
          </div>
        )}
      </div>
    </button>
  );
}

function SessionDrawer({ session, onClose, now }) {
  const scrollRef = useRef(null);
  const scenario = session.scenarioId ? scenarioById(session.scenarioId) : null;
  const elapsedMs = session.startedAt
    ? (session.endedAt || now) - session.startedAt
    : 0;

  const overall = parseFeedbackSection(session.feedback, "OVERALL");
  const takeaway = parseFeedbackSection(session.feedback, "KEY TAKEAWAY");
  const caseEntry = parseFeedbackSection(session.feedback, "CASE ENTRY COVERED");
  const missed = parseFeedbackSection(session.feedback, "KEY QUESTIONS MISSED");
  const didWell = parseFeedbackList(session.feedback, "WHAT YOU DID WELL", [
    "WHAT TO REMEMBER NEXT TIME",
    "KEY TAKEAWAY",
    "EMD CODE",
  ]);
  const remember = parseFeedbackList(
    session.feedback,
    "WHAT TO REMEMBER NEXT TIME",
    ["KEY TAKEAWAY", "EMD CODE", "CASE ENTRY COVERED", "KEY QUESTIONS MISSED"]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [session.messages, session.interim, session.feedback]);

  return (
    <div className="fixed inset-0 bg-black/70 z-40 flex" onClick={onClose}>
      <div className="ml-auto w-full max-w-4xl bg-stone-950 border-l border-stone-800 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Drawer header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center gap-4">
          <div className="text-4xl">{scenario?.emoji || "📞"}</div>
          <div className="flex-1 min-w-0">
            <div className="text-stone-100 text-xl font-bold leading-tight">
              {scenario?.title || "Unknown scenario"}
            </div>
            <div className="text-stone-500 text-xs">
              {scenario?.location} · Session {session.id.slice(0, 6)}
            </div>
          </div>
          <div className="text-stone-300 font-mono text-lg tabular-nums">
            {formatTimer(elapsedMs)}
          </div>
          <button
            onClick={() => {
              if (confirm("Remove this session from the projector?")) {
                deleteSession(session.id);
                onClose();
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm"
          >
            Remove
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-sm"
          >
            Close
          </button>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-5 overflow-hidden p-5">
          {/* Transcript */}
          <div className="col-span-2 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-800 text-stone-200 font-bold">
              Transcript
            </div>
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
              {(session.messages || []).map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-base leading-snug ${
                      m.role === "user"
                        ? "bg-red-600 text-white rounded-br-md"
                        : "bg-stone-800 text-stone-100 rounded-bl-md"
                    }`}
                  >
                    <div className="text-[10px] uppercase opacity-70 mb-0.5 tracking-widest">
                      {m.role === "user" ? "Caller" : "Dispatcher"}
                    </div>
                    {m.content}
                  </div>
                </div>
              ))}
              {session.interim && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-base bg-red-600/40 text-white italic">
                    {session.interim}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div className="flex flex-col gap-3 overflow-y-auto">
            {scenario && (
              <div className="rounded-2xl bg-stone-900 border border-stone-800 p-4">
                <div className="text-[10px] uppercase tracking-widest text-stone-500">
                  Scenario
                </div>
                <div className="text-stone-200 text-sm mt-1 leading-snug">
                  {scenario.brief}
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-stone-900 border border-stone-800 p-4">
              <div className="text-[10px] uppercase tracking-widest text-sky-400">
                Assigned EMD
              </div>
              <div className="font-mono text-stone-100 text-lg mt-1 break-words leading-tight">
                {session.emdCode || "—"}
              </div>
              {scenario && (
                <div className="text-stone-500 text-xs mt-1.5">
                  Target:{" "}
                  <span className="font-mono text-stone-300">
                    {scenario.expectedDeterminant}
                  </span>
                </div>
              )}
            </div>

            {overall && (
              <div className="rounded-2xl bg-stone-900 border border-stone-800 p-4">
                <div className="text-[10px] uppercase tracking-widest text-red-400 mb-1">
                  Overall
                </div>
                <div className="text-stone-200 text-sm">{overall}</div>
              </div>
            )}

            {didWell.length > 0 && (
              <div className="rounded-2xl bg-stone-900 border border-stone-800 p-4">
                <div className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1.5">
                  Did Well
                </div>
                <ul className="space-y-1 text-stone-200 text-sm">
                  {didWell.map((x, i) => (
                    <li key={i}>• {x}</li>
                  ))}
                </ul>
              </div>
            )}

            {remember.length > 0 && (
              <div className="rounded-2xl bg-stone-900 border border-stone-800 p-4">
                <div className="text-[10px] uppercase tracking-widest text-amber-400 mb-1.5">
                  Remember
                </div>
                <ul className="space-y-1 text-stone-200 text-sm">
                  {remember.map((x, i) => (
                    <li key={i}>• {x}</li>
                  ))}
                </ul>
              </div>
            )}

            {(caseEntry || missed) && (
              <div className="rounded-2xl bg-stone-900 border border-stone-800 p-4 space-y-2">
                {caseEntry && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-emerald-400">
                      Case Entry Covered
                    </div>
                    <div className="text-stone-200 text-sm">{caseEntry}</div>
                  </div>
                )}
                {missed && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-400">
                      Key Questions Missed
                    </div>
                    <div className="text-stone-200 text-sm">{missed}</div>
                  </div>
                )}
              </div>
            )}

            {takeaway && (
              <div className="rounded-2xl bg-red-950/40 border border-red-800/60 p-4">
                <div className="text-[10px] uppercase tracking-widest text-red-300">
                  Key Takeaway
                </div>
                <div className="text-stone-50 text-base font-semibold leading-snug">
                  {takeaway}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminScreen() {
  const [sessions, setSessions] = useState({});
  const [connected, setConnected] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [filter, setFilter] = useState("active"); // active | all
  const [latestDispatch, setLatestDispatch] = useState(null);
  const [audioReady, setAudioReady] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const spokenDispatchKeys = useRef(new Set());

  useEffect(() => {
    const es = new EventSource("/api/admin/stream");
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setSessions(data.sessions || {});
      } catch {
        // ignore
      }
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  // Watch for new dispatch events and announce them over the TV speakers.
  useEffect(() => {
    if (!audioReady) return;
    for (const s of Object.values(sessions)) {
      if (!s.dispatch) continue;
      const key = `${s.id}:${s.dispatch.timestamp}`;
      if (spokenDispatchKeys.current.has(key)) continue;
      spokenDispatchKeys.current.add(key);
      const enriched = { ...s.dispatch, sessionId: s.id };
      setLatestDispatch(enriched);
      announceDispatch(enriched);
    }
  }, [sessions, audioReady]);

  const handleEnableAudio = () => {
    // iOS/Safari and Chrome require a user gesture before SpeechSynthesis works.
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const u = new SpeechSynthesisUtterance("Dispatch audio enabled.");
        u.volume = 1.0;
        window.speechSynthesis.speak(u);
      } catch {
        // ignore
      }
    }
    setAudioReady(true);
  };

  const replayLatest = () => {
    if (!latestDispatch) return;
    announceDispatch(latestDispatch);
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const list = useMemo(() => {
    const arr = Object.values(sessions);
    const filtered =
      filter === "active"
        ? arr.filter((s) => s.status !== "idle")
        : arr;
    return filtered.sort((a, b) => {
      // Live calls first, then by most recent activity.
      const liveOrder = (s) => {
        if (s.status === "in-call") return 0;
        if (s.status === "ringing") return 1;
        if (s.status === "ended") return 2;
        if (s.status === "feedback-ready") return 3;
        return 4;
      };
      const la = liveOrder(a);
      const lb = liveOrder(b);
      if (la !== lb) return la - lb;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }, [sessions, filter]);

  const stats = useMemo(() => {
    const arr = Object.values(sessions);
    return {
      total: arr.length,
      live: arr.filter((s) => s.status === "in-call").length,
      ended: arr.filter((s) => s.status === "ended" || s.status === "feedback-ready").length,
    };
  }, [sessions]);

  const selected = selectedId ? sessions[selectedId] : null;

  const reviewable = useMemo(() => {
    const arr = Object.values(sessions).filter(
      (s) => s.status === "ended" || s.status === "feedback-ready" || (s.messages && s.messages.length > 1)
    );
    return arr.sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
  }, [sessions]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* Header */}
      <div className="px-8 py-5 border-b border-stone-800 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-baseline gap-4">
          <div className="text-red-500 text-4xl font-black tracking-tight">
            911
          </div>
          <div>
            <div className="text-stone-100 text-2xl font-bold leading-tight">
              Suffolk County FRES Training
            </div>
            <div className="text-stone-400 text-sm">
              Mock 911 Simulator · Instructor Dashboard
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-5 text-sm">
            <div>
              <div className="text-stone-500 text-[10px] uppercase tracking-widest">
                Total
              </div>
              <div className="text-stone-100 text-xl font-bold">
                {stats.total}
              </div>
            </div>
            <div>
              <div className="text-stone-500 text-[10px] uppercase tracking-widest">
                Live
              </div>
              <div className="text-red-400 text-xl font-bold">
                {stats.live}
              </div>
            </div>
            <div>
              <div className="text-stone-500 text-[10px] uppercase tracking-widest">
                Done
              </div>
              <div className="text-sky-300 text-xl font-bold">
                {stats.ended}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                filter === "active"
                  ? "bg-red-600 border-red-500 text-white"
                  : "bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                filter === "all"
                  ? "bg-red-600 border-red-500 text-white"
                  : "bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700"
              }`}
            >
              All
            </button>
          </div>
          <div
            className={`w-3 h-3 rounded-full ${
              connected ? "bg-emerald-400" : "bg-stone-600"
            }`}
            title={connected ? "Connected" : "Disconnected"}
          />
          {!audioReady ? (
            <button
              onClick={handleEnableAudio}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 border border-amber-500 text-white text-sm font-bold"
              title="Required once per session — speech needs a user gesture"
            >
              🔊 Enable Dispatch Audio
            </button>
          ) : (
            <span className="text-emerald-300 text-xs font-mono">🔊 audio live</span>
          )}
          <button
            onClick={() => setReviewing(true)}
            disabled={reviewable.length === 0}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 text-white text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed"
            title={reviewable.length === 0 ? "Need at least one completed call" : "Review all completed calls"}
          >
            🎬 Session Review ({reviewable.length})
          </button>
          <button
            onClick={() => {
              if (confirm("Clear ALL sessions from the projector?")) {
                resetAdmin();
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm"
          >
            Reset All
          </button>
        </div>
      </div>

      {latestDispatch && (
        <div className="px-8 py-3 bg-amber-950/40 border-b border-amber-800/60 flex items-center gap-4">
          <div className="text-amber-400 text-3xl">📻</div>
          <div className="flex-1 min-w-0">
            <div className="text-amber-300 text-[10px] uppercase tracking-widest font-bold">
              Radio Dispatch · {new Date(latestDispatch.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-amber-100 font-mono text-sm leading-snug truncate">
              {latestDispatch.department} — {latestDispatch.code} {latestDispatch.nature} — age {latestDispatch.age} at {latestDispatch.location}
            </div>
          </div>
          <button
            onClick={replayLatest}
            className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold"
          >
            🔁 Replay
          </button>
          <button
            onClick={() => setLatestDispatch(null)}
            className="px-2 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 px-8 py-6">
        {list.length === 0 ? (
          <div className="h-full flex items-center justify-center text-stone-500 text-lg">
            Waiting for explorers to start a call…
            <br />
            <span className="text-stone-600 text-sm mt-2 block">
              Have them open the main site on their phone and pick a scenario.
            </span>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {list.map((s) => (
              <SessionCard
                key={s.id}
                s={s}
                onSelect={() => setSelectedId(s.id)}
                now={now}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <SessionDrawer
          session={selected}
          onClose={() => setSelectedId(null)}
          now={now}
        />
      )}

      {reviewing && (
        <ReviewScreen
          sessions={reviewable}
          onClose={() => setReviewing(false)}
        />
      )}
    </div>
  );
}
