import React, { useEffect, useState } from "react";
import { fetchFeedback } from "../lib/api.js";

function parseFeedback(text) {
  const sections = {
    overall: "",
    didWell: [],
    remember: [],
    takeaway: "",
  };
  if (!text) return sections;

  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let current = null;
  for (const line of lines) {
    if (!line) continue;
    if (/^OVERALL\s*:/i.test(line)) {
      sections.overall = line.replace(/^OVERALL\s*:/i, "").trim();
      current = "overall";
    } else if (/^WHAT YOU DID WELL\s*:?/i.test(line)) {
      current = "didWell";
    } else if (/^WHAT TO REMEMBER NEXT TIME\s*:?/i.test(line)) {
      current = "remember";
    } else if (/^KEY TAKEAWAY\s*:/i.test(line)) {
      sections.takeaway = line.replace(/^KEY TAKEAWAY\s*:/i, "").trim();
      current = "takeaway";
    } else if (line.startsWith("-") || line.startsWith("•")) {
      const item = line.replace(/^[-•]\s*/, "").trim();
      if (current === "didWell") sections.didWell.push(item);
      else if (current === "remember") sections.remember.push(item);
    } else if (current === "overall" && !sections.overall) {
      sections.overall = line;
    } else if (current === "takeaway" && !sections.takeaway) {
      sections.takeaway = line;
    }
  }
  return sections;
}

export default function FeedbackScreen({ scenario, messages, onRestart }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [raw, setRaw] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { feedback } = await fetchFeedback({
          scenarioId: scenario.id,
          messages,
        });
        if (!cancelled) {
          setRaw(feedback);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Failed to get feedback.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scenario.id, messages]);

  const parsed = parseFeedback(raw);

  return (
    <div className="min-h-full flex flex-col px-5 py-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="text-stone-400 text-xs uppercase tracking-widest">
          Call Review
        </div>
        <div className="text-stone-100 text-2xl font-bold mt-1">
          {scenario.title}
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
          <div className="text-4xl mb-3 animate-pulse">📝</div>
          <div>Reviewing your call…</div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 text-red-200 text-sm p-3">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-5">
          {parsed.overall && (
            <div className="rounded-2xl bg-stone-800 border border-stone-700 p-5">
              <div className="text-xs uppercase tracking-widest text-red-400 mb-1.5">
                Overall
              </div>
              <div className="text-stone-100 text-base leading-snug">
                {parsed.overall}
              </div>
            </div>
          )}

          {parsed.didWell.length > 0 && (
            <div className="rounded-2xl bg-stone-800 border border-stone-700 p-5">
              <div className="text-xs uppercase tracking-widest text-green-400 mb-2">
                ✓ What You Did Well
              </div>
              <ul className="space-y-2">
                {parsed.didWell.map((item, i) => (
                  <li key={i} className="text-stone-100 text-sm leading-snug flex gap-2">
                    <span className="text-green-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.remember.length > 0 && (
            <div className="rounded-2xl bg-stone-800 border border-stone-700 p-5">
              <div className="text-xs uppercase tracking-widest text-amber-400 mb-2">
                ↑ Remember Next Time
              </div>
              <ul className="space-y-2">
                {parsed.remember.map((item, i) => (
                  <li key={i} className="text-stone-100 text-sm leading-snug flex gap-2">
                    <span className="text-amber-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.takeaway && (
            <div className="rounded-2xl bg-red-950/40 border border-red-800/60 p-5">
              <div className="text-xs uppercase tracking-widest text-red-300 mb-1.5">
                Key Takeaway
              </div>
              <div className="text-stone-50 text-base font-semibold leading-snug">
                {parsed.takeaway}
              </div>
            </div>
          )}

          {!parsed.overall && !parsed.takeaway && raw && (
            <div className="rounded-2xl bg-stone-800 border border-stone-700 p-5 text-stone-200 text-sm whitespace-pre-wrap">
              {raw}
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={onRestart}
          className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg"
        >
          Try Another Scenario
        </button>
      </div>
    </div>
  );
}
