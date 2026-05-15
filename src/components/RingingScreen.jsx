import React, { useEffect } from "react";
import { playRing } from "../lib/sound.js";

const CALLER_TIPS = [
  { icon: "📍", text: "Tell them WHERE you are first." },
  { icon: "📞", text: "Give a callback phone number." },
  { icon: "🆘", text: "Stay calm — answer each question." },
  { icon: "☎️", text: "Don't hang up until they tell you." },
];

const DISPATCHER_TIPS = [
  { icon: "📍", text: "Get the location FIRST." },
  { icon: "📞", text: "Then the callback number." },
  { icon: "🫁", text: "Ask: awake? breathing?" },
  { icon: "🚒", text: "Dispatch units EARLY — don't wait." },
];

export default function RingingScreen({
  scenario,
  dispatcher,
  pd,
  mode = "caller",
  callerName,
  difficulty = "medium",
  onConnected,
  onCancel,
}) {
  useEffect(() => {
    playRing();
    const t = setTimeout(onConnected, 4200);
    return () => clearTimeout(t);
  }, [onConnected]);

  const tips = mode === "dispatcher" ? DISPATCHER_TIPS : CALLER_TIPS;

  if (mode === "dispatcher") {
    return (
      <div className="min-h-full flex flex-col items-center justify-between px-5 py-8 max-w-md mx-auto">
        <div className="text-center w-full">
          <div className="text-stone-400 text-sm uppercase tracking-widest">
            Incoming Transfer
          </div>
          <div className="text-sky-400 text-5xl font-black tracking-tight mt-2">
            FRES
          </div>
          <div className="text-stone-300 text-base mt-3">
            PD is conferencing in a caller…
          </div>
          {dispatcher && (
            <div className="text-stone-500 text-xs mt-1 font-mono">
              You are Dispatcher {dispatcher.lastName} · #{dispatcher.badge}
            </div>
          )}
          <TipCard tips={tips} title="Remember" accent="sky" />
        </div>

        <div className="text-7xl origin-center animate-ring-shake my-4" aria-hidden>
          ☎️
        </div>

        <button
          onClick={onCancel}
          className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white text-3xl shadow-lg"
          aria-label="Cancel"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-between px-5 py-8 max-w-md mx-auto">
      <div className="text-center w-full">
        <div className="text-stone-400 text-sm uppercase tracking-widest">
          Calling…
        </div>
        <div className="text-red-500 text-6xl font-black tracking-tight mt-2">
          911
        </div>
        <div className="text-stone-300 text-base mt-3">{scenario?.title}</div>
        {pd && (
          <div className="text-stone-500 text-xs mt-1 font-mono">
            Suffolk County Police · Officer {pd.lastName} #{pd.badge}
          </div>
        )}
        {callerName && (
          <div className="text-stone-400 text-xs mt-1">
            Calling as: <span className="text-stone-200 font-semibold">{callerName}</span>
            {difficulty !== "medium" && (
              <span className="text-stone-500"> · {difficulty} mode</span>
            )}
          </div>
        )}
        {scenario?.brief && (
          <div className="mt-3 mx-auto max-w-xs rounded-xl border border-stone-700 bg-stone-800/60 px-4 py-3 text-stone-200 text-sm leading-snug">
            <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">
              Your situation
            </div>
            {scenario.brief}
          </div>
        )}
        <TipCard tips={tips} title="Remember" accent="red" />
      </div>

      <div className="text-7xl origin-center animate-ring-shake my-3" aria-hidden>
        📞
      </div>

      <button
        onClick={onCancel}
        className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white text-3xl shadow-lg"
        aria-label="Cancel call"
      >
        ✕
      </button>
    </div>
  );
}

function TipCard({ tips, title, accent = "red" }) {
  const accentMap = {
    red: "border-red-800/50 bg-red-950/30 text-red-200",
    sky: "border-sky-800/50 bg-sky-950/30 text-sky-200",
  };
  return (
    <div className={`mt-4 mx-auto max-w-xs rounded-xl border p-3 text-left ${accentMap[accent]}`}>
      <div className={`text-[10px] uppercase tracking-widest mb-1.5 font-bold`}>
        {title}
      </div>
      <ul className="space-y-1">
        {tips.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
            <span className="text-base shrink-0">{t.icon}</span>
            <span className="text-stone-100">{t.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
