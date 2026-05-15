import React from "react";
import { SCENARIOS } from "../scenarios.js";

export default function HomeScreen({ onPick, supportWarning }) {
  return (
    <div className="min-h-full flex flex-col items-center px-5 py-8 max-w-md mx-auto">
      <div className="w-full text-center mb-8">
        <div className="text-red-500 text-5xl font-black tracking-tight">911</div>
        <div className="text-stone-200 text-2xl font-bold mt-1">Training Simulator</div>
        <p className="text-stone-400 text-sm mt-3 leading-snug">
          Practice making a real 911 call. Pick a scenario, then talk to the
          dispatcher out loud.
        </p>
      </div>

      {supportWarning && (
        <div className="w-full mb-5 rounded-lg border border-amber-700/60 bg-amber-950/40 text-amber-200 text-sm p-3">
          {supportWarning}
        </div>
      )}

      <div className="w-full text-stone-400 text-xs uppercase tracking-widest mb-3">
        Choose an emergency
      </div>

      <div className="w-full grid grid-cols-1 gap-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s)}
            className="w-full text-left rounded-2xl bg-stone-800 hover:bg-stone-700 active:bg-stone-700 border border-stone-700 p-5 flex items-center gap-4 transition"
          >
            <div className="text-4xl" aria-hidden>
              {s.emoji}
            </div>
            <div className="flex-1">
              <div className="text-stone-100 text-lg font-bold">{s.title}</div>
              <div className="text-stone-400 text-sm mt-0.5">{s.brief}</div>
            </div>
            <div className="text-red-500 text-xl">›</div>
          </button>
        ))}
      </div>

      <div className="mt-8 text-stone-500 text-xs text-center max-w-xs">
        This is a training simulation. Do not use this app in a real emergency —
        call 911 from your phone.
      </div>
    </div>
  );
}
