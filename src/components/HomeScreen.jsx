import React, { useMemo, useState } from "react";
import { SCENARIOS, CATEGORIES, difficultyColor } from "../scenarios.js";

export default function HomeScreen({ onPick, supportWarning }) {
  const [category, setCategory] = useState("all");
  const [mode, setMode] = useState("caller");
  const [callerName, setCallerName] = useState("");
  const [difficulty, setDifficulty] = useState("medium");

  const filtered = useMemo(() => {
    if (category === "all") return SCENARIOS;
    return SCENARIOS.filter((s) => s.category === category);
  }, [category]);

  return (
    <div className="min-h-full flex flex-col items-center px-5 py-8 max-w-md mx-auto">
      <div className="w-full text-center mb-6">
        <div className="text-red-500 text-5xl font-black tracking-tight">911</div>
        <div className="text-stone-200 text-xl font-bold mt-1">
          Suffolk County FRES Training
        </div>
        <p className="text-stone-400 text-sm mt-2 leading-snug">
          Pick a scenario and practice a real 911 call out loud.
        </p>
      </div>

      <div className="w-full mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode("caller")}
          className={`rounded-xl p-3 border text-left transition ${
            mode === "caller"
              ? "bg-red-600/90 border-red-500 text-white"
              : "bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700"
          }`}
        >
          <div className="text-sm font-bold">📞 Be the Caller</div>
          <div className="text-[11px] mt-0.5 opacity-90 leading-snug">
            You dial 911. Police picks up, transfers to Fire Rescue.
          </div>
        </button>
        <button
          onClick={() => setMode("dispatcher")}
          className={`rounded-xl p-3 border text-left transition ${
            mode === "dispatcher"
              ? "bg-sky-600/90 border-sky-500 text-white"
              : "bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700"
          }`}
        >
          <div className="text-sm font-bold">🎧 Be the Dispatcher</div>
          <div className="text-[11px] mt-0.5 opacity-90 leading-snug">
            You're FRES. A transferred call comes in — you run protocol.
          </div>
        </button>
      </div>

      <div className="w-full mb-3">
        <label className="block text-stone-400 text-[11px] uppercase tracking-widest mb-1.5">
          Your first name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={callerName}
          onChange={(e) => setCallerName(e.target.value.slice(0, 24))}
          placeholder="Required — used in feedback + leaderboard"
          className={`w-full rounded-xl bg-stone-800 border text-stone-100 px-3 py-2.5 text-base placeholder:text-stone-500 focus:outline-none ${
            callerName.trim()
              ? "border-stone-700 focus:border-stone-500"
              : "border-red-700/60 focus:border-red-500"
          }`}
          autoComplete="given-name"
        />
      </div>

      <div className="w-full mb-4">
        <div className="text-stone-400 text-[11px] uppercase tracking-widest mb-1.5">
          Difficulty
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "easy", label: "Easy", desc: "Calm caller" },
            { id: "medium", label: "Medium", desc: "Realistic" },
            { id: "hard", label: "Hard", desc: "Chaotic" },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className={`rounded-xl p-2.5 border text-center transition ${
                difficulty === d.id
                  ? d.id === "easy"
                    ? "bg-emerald-700 border-emerald-500 text-white"
                    : d.id === "hard"
                      ? "bg-red-700 border-red-500 text-white"
                      : "bg-amber-700 border-amber-500 text-white"
                  : "bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700"
              }`}
            >
              <div className="text-sm font-bold">{d.label}</div>
              <div className="text-[10px] opacity-80 leading-tight">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {supportWarning && (
        <div className="w-full mb-5 rounded-lg border border-amber-700/60 bg-amber-950/40 text-amber-200 text-sm p-3">
          {supportWarning}
        </div>
      )}

      {!callerName.trim() && (
        <div className="w-full mb-3 rounded-lg border border-red-800/60 bg-red-950/30 text-red-200 text-sm p-3">
          Enter your first name above to start a call.
        </div>
      )}

      <button
        disabled={!callerName.trim()}
        onClick={() => {
          if (!callerName.trim()) return;
          const pool = category === "all"
            ? SCENARIOS
            : SCENARIOS.filter((s) => s.category === category);
          if (pool.length === 0) return;
          const pick = pool[Math.floor(Math.random() * pool.length)];
          onPick(pick, mode, { callerName: callerName.trim(), difficulty });
        }}
        className="w-full mb-4 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500 text-white p-4 flex items-center gap-4 shadow-lg active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <div className="text-4xl" aria-hidden>🎲</div>
        <div className="flex-1 text-left">
          <div className="text-lg font-bold leading-tight">Try a Random Call</div>
          <div className="text-[12px] opacity-90 leading-snug">
            Pick for me — surprise scenario from the {category === "all" ? "full list" : "this category"}.
          </div>
        </div>
        <div className="text-2xl">›</div>
      </button>

      <div className="w-full mb-4 flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${
              category === c.id
                ? "bg-red-600 border-red-500 text-white"
                : "bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="w-full grid grid-cols-1 gap-3">
        {filtered.map((s) => (
          <button
            key={s.id}
            disabled={!callerName.trim()}
            onClick={() => {
              if (!callerName.trim()) return;
              onPick(s, mode, { callerName: callerName.trim(), difficulty });
            }}
            className="w-full text-left rounded-2xl bg-stone-800 hover:bg-stone-700 active:bg-stone-700 border border-stone-700 p-4 flex items-start gap-4 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="text-3xl pt-0.5" aria-hidden>
              {s.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-stone-100 text-lg font-bold">{s.title}</div>
                <span
                  className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${difficultyColor(
                    s.difficulty
                  )}`}
                >
                  {s.difficulty}
                </span>
              </div>
              <div className="text-stone-400 text-sm mt-1 leading-snug">
                {s.brief}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-stone-500">
                <span className="font-mono text-stone-400">
                  FRES {s.expectedDeterminant}
                </span>
                <span className="text-stone-600">·</span>
                <span>Card {s.emdCard} — {s.emdName}</span>
              </div>
            </div>
            <div className="text-red-500 text-xl pt-1">›</div>
          </button>
        ))}
      </div>

      <div className="mt-8 text-stone-500 text-xs text-center max-w-xs">
        Training simulation only. Do not use this app in a real emergency —
        call 911 directly.
      </div>
    </div>
  );
}
