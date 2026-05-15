import React, { useEffect } from "react";
import { playRing } from "../lib/sound.js";

export default function RingingScreen({ scenario, dispatcher, onConnected, onCancel }) {
  useEffect(() => {
    playRing();
    const t = setTimeout(onConnected, 2200);
    return () => clearTimeout(t);
  }, [onConnected]);

  return (
    <div className="min-h-full flex flex-col items-center justify-between px-5 py-10 max-w-md mx-auto">
      <div className="text-center">
        <div className="text-stone-400 text-sm uppercase tracking-widest">
          Calling…
        </div>
        <div className="text-red-500 text-6xl font-black tracking-tight mt-2">
          911
        </div>
        <div className="text-stone-300 text-base mt-3">{scenario?.title}</div>
        {dispatcher && (
          <div className="text-stone-500 text-xs mt-1 font-mono">
            Connecting to Dispatcher {dispatcher.lastName} · #{dispatcher.badge}
          </div>
        )}
        {scenario?.brief && (
          <div className="mt-4 mx-auto max-w-xs rounded-xl border border-stone-700 bg-stone-800/60 px-4 py-3 text-stone-200 text-sm leading-snug">
            <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">
              Your situation
            </div>
            {scenario.brief}
          </div>
        )}
      </div>

      <div className="text-7xl origin-center animate-ring-shake" aria-hidden>
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
