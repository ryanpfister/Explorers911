import React, { useEffect, useMemo, useRef, useState } from "react";
import { scenarioById, difficultyColor } from "../scenarios.js";
import { resetAdmin } from "../lib/admin.js";

function formatTimer(ms) {
  if (!ms || ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
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

export default function AdminScreen() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(Date.now());
  const scrollRef = useRef(null);

  useEffect(() => {
    const es = new EventSource("/api/admin/stream");
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        setState(JSON.parse(e.data));
      } catch {
        // ignore
      }
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [state?.messages, state?.interim, state?.feedback]);

  const scenario = state?.scenarioId ? scenarioById(state.scenarioId) : null;

  const elapsedMs = useMemo(() => {
    if (!state?.startedAt) return 0;
    if (state.endedAt) return state.endedAt - state.startedAt;
    return now - state.startedAt;
  }, [state?.startedAt, state?.endedAt, now]);

  const didWell = parseFeedbackList(state?.feedback, "WHAT YOU DID WELL", [
    "WHAT TO REMEMBER NEXT TIME",
    "KEY TAKEAWAY",
    "EMD CODE",
  ]);
  const remember = parseFeedbackList(
    state?.feedback,
    "WHAT TO REMEMBER NEXT TIME",
    ["KEY TAKEAWAY", "EMD CODE", "CASE ENTRY COVERED", "KEY QUESTIONS MISSED"]
  );
  const takeaway = parseFeedbackSection(state?.feedback, "KEY TAKEAWAY");
  const overall = parseFeedbackSection(state?.feedback, "OVERALL");
  const caseEntry = parseFeedbackSection(state?.feedback, "CASE ENTRY COVERED");
  const missed = parseFeedbackSection(state?.feedback, "KEY QUESTIONS MISSED");

  const statusLabel =
    state?.status === "idle"
      ? "Waiting for a call…"
      : state?.status === "ringing"
        ? "Connecting…"
        : state?.status === "in-call"
          ? state.callerStatus === "listening"
            ? "🎙 Caller is speaking"
            : state.callerStatus === "thinking"
              ? "… Sending to dispatcher"
              : state.callerStatus === "speaking-dispatcher"
                ? "🔊 Dispatcher is speaking"
                : "Live"
          : state?.status === "ended"
            ? "Call ended — reviewing"
            : state?.status === "feedback-ready"
              ? "Review complete"
              : "—";

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* Header */}
      <div className="px-8 py-5 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <div className="text-red-500 text-4xl font-black tracking-tight">
            911
          </div>
          <div>
            <div className="text-stone-100 text-2xl font-bold leading-tight">
              Suffolk County FRES Training
            </div>
            <div className="text-stone-400 text-sm">
              Mock 911 Call Simulator · Instructor View
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-stone-500 text-xs uppercase tracking-widest">
              Status
            </div>
            <div className="text-stone-100 text-xl font-semibold">
              {statusLabel}
            </div>
          </div>
          <div
            className={`w-3 h-3 rounded-full ${
              connected ? "bg-emerald-400" : "bg-stone-600"
            }`}
            title={connected ? "Connected" : "Disconnected"}
          />
          <button
            onClick={() => {
              if (confirm("Reset the projector view?")) resetAdmin();
            }}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Body: scenario + transcript + sidebar */}
      <div className="flex-1 grid grid-cols-12 gap-6 px-8 py-6">
        {/* Left — scenario card */}
        <div className="col-span-3 flex flex-col gap-4">
          {scenario ? (
            <div className="rounded-2xl bg-stone-900 border border-stone-800 p-6">
              <div className="text-5xl mb-3">{scenario.emoji}</div>
              <div className="text-stone-100 text-2xl font-bold leading-tight">
                {scenario.title}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={`text-[11px] uppercase tracking-widest px-2 py-0.5 rounded border ${difficultyColor(
                    scenario.difficulty
                  )}`}
                >
                  {scenario.difficulty}
                </span>
                <span className="text-stone-400 text-xs">
                  {scenario.location}
                </span>
              </div>
              <div className="mt-4 text-stone-300 text-sm leading-snug">
                {scenario.brief}
              </div>
              <div className="mt-4 pt-4 border-t border-stone-800">
                <div className="text-[10px] uppercase tracking-widest text-stone-500">
                  Target FRES Code
                </div>
                <div className="font-mono text-stone-100 text-lg mt-1">
                  {scenario.expectedDeterminant}
                </div>
                <div className="text-stone-400 text-xs mt-0.5">
                  Card {scenario.emdCard} — {scenario.emdName}
                </div>
                <div className="text-stone-400 text-xs mt-2 italic">
                  {scenario.expectedName}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-stone-900 border border-stone-800 p-6 text-stone-500 text-sm">
              No active scenario. The projector will update automatically when
              a caller picks a scenario on their device.
            </div>
          )}
        </div>

        {/* Center — live transcript */}
        <div className="col-span-6 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
            <div className="text-stone-200 text-lg font-bold">Live Transcript</div>
            <div className="text-stone-400 font-mono text-lg tabular-nums">
              {formatTimer(elapsedMs)}
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {(!state?.messages || state.messages.length === 0) && !state?.interim && (
              <div className="text-stone-500 text-base italic">
                Waiting for the caller…
              </div>
            )}
            {state?.messages?.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-3 text-lg leading-snug ${
                    m.role === "user"
                      ? "bg-red-600 text-white rounded-br-md"
                      : "bg-stone-800 text-stone-100 rounded-bl-md"
                  }`}
                >
                  <div className="text-[10px] uppercase opacity-70 mb-1 tracking-widest">
                    {m.role === "user" ? "Caller (Explorer)" : "Dispatcher"}
                  </div>
                  {m.content}
                </div>
              </div>
            ))}
            {state?.interim && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md px-5 py-3 text-lg bg-red-600/40 text-white italic">
                  {state.interim}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — review / EMD */}
        <div className="col-span-3 flex flex-col gap-4">
          <div className="rounded-2xl bg-stone-900 border border-stone-800 p-5">
            <div className="text-[10px] uppercase tracking-widest text-sky-400 mb-1">
              Assigned EMD Code
            </div>
            <div className="font-mono text-stone-100 text-2xl break-words leading-tight">
              {state?.emdCode || "—"}
            </div>
            {scenario && (
              <div className="mt-3 text-stone-500 text-xs">
                Expected:{" "}
                <span className="font-mono text-stone-300">
                  {scenario.expectedDeterminant}
                </span>
              </div>
            )}
          </div>

          {overall && (
            <div className="rounded-2xl bg-stone-900 border border-stone-800 p-5">
              <div className="text-[10px] uppercase tracking-widest text-red-400 mb-1">
                Overall
              </div>
              <div className="text-stone-100 text-base leading-snug">
                {overall}
              </div>
            </div>
          )}

          {didWell.length > 0 && (
            <div className="rounded-2xl bg-stone-900 border border-stone-800 p-5">
              <div className="text-[10px] uppercase tracking-widest text-green-400 mb-2">
                ✓ Did Well
              </div>
              <ul className="space-y-1.5">
                {didWell.map((x, i) => (
                  <li key={i} className="text-stone-200 text-sm leading-snug">
                    • {x}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {remember.length > 0 && (
            <div className="rounded-2xl bg-stone-900 border border-stone-800 p-5">
              <div className="text-[10px] uppercase tracking-widest text-amber-400 mb-2">
                ↑ Remember
              </div>
              <ul className="space-y-1.5">
                {remember.map((x, i) => (
                  <li key={i} className="text-stone-200 text-sm leading-snug">
                    • {x}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(caseEntry || missed) && (
            <div className="rounded-2xl bg-stone-900 border border-stone-800 p-5 space-y-2">
              {caseEntry && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-emerald-400 mb-0.5">
                    Case Entry Covered
                  </div>
                  <div className="text-stone-200 text-sm">{caseEntry}</div>
                </div>
              )}
              {missed && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-400 mb-0.5">
                    Key Questions Missed
                  </div>
                  <div className="text-stone-200 text-sm">{missed}</div>
                </div>
              )}
            </div>
          )}

          {takeaway && (
            <div className="rounded-2xl bg-red-950/40 border border-red-800/60 p-5">
              <div className="text-[10px] uppercase tracking-widest text-red-300 mb-1">
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
  );
}
