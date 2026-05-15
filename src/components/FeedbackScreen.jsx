import React, { useEffect, useState } from "react";
import { fetchFeedback } from "../lib/api.js";

function parseFeedback(text) {
  const out = {
    overall: "",
    didWell: [],
    remember: [],
    takeaway: "",
    emdCode: "",
    caseEntry: "",
    keyMissed: "",
  };
  if (!text) return out;

  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let current = null;
  for (const line of lines) {
    if (!line) continue;
    if (/^OVERALL\s*:/i.test(line)) {
      out.overall = line.replace(/^OVERALL\s*:/i, "").trim();
      current = "overall";
    } else if (/^WHAT YOU DID WELL\s*:?/i.test(line)) {
      current = "didWell";
    } else if (/^WHAT TO REMEMBER NEXT TIME\s*:?/i.test(line)) {
      current = "remember";
    } else if (/^KEY TAKEAWAY\s*:/i.test(line)) {
      out.takeaway = line.replace(/^KEY TAKEAWAY\s*:/i, "").trim();
      current = "takeaway";
    } else if (/^EMD CODE\s*:/i.test(line)) {
      out.emdCode = line.replace(/^EMD CODE\s*:/i, "").trim();
      current = "emdCode";
    } else if (/^CASE ENTRY COVERED\s*:/i.test(line)) {
      out.caseEntry = line.replace(/^CASE ENTRY COVERED\s*:/i, "").trim();
      current = "caseEntry";
    } else if (/^KEY QUESTIONS MISSED\s*:/i.test(line)) {
      out.keyMissed = line.replace(/^KEY QUESTIONS MISSED\s*:/i, "").trim();
      current = "keyMissed";
    } else if (line.startsWith("-") || line.startsWith("•")) {
      const item = line.replace(/^[-•]\s*/, "").trim();
      if (current === "didWell") out.didWell.push(item);
      else if (current === "remember") out.remember.push(item);
    } else if (current === "overall" && !out.overall) {
      out.overall = line;
    } else if (current === "takeaway" && !out.takeaway) {
      out.takeaway = line;
    }
  }
  return out;
}

export default function FeedbackScreen({ scenario, messages, sessionId, mode = "caller", onRestart }) {
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
          sessionId,
          mode,
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
  }, [scenario.id, messages, sessionId, mode]);

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
        <div className="text-stone-500 text-xs mt-1 font-mono">
          Target: FRES {scenario.expectedDeterminant}
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
        <div className="space-y-4">
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

          {parsed.emdCode && (
            <div className="rounded-2xl bg-stone-800 border border-stone-700 p-5">
              <div className="text-xs uppercase tracking-widest text-sky-400 mb-1.5">
                EMD Code Assigned
              </div>
              <div className="text-stone-100 text-base font-mono leading-snug">
                {parsed.emdCode}
              </div>
              <div className="text-stone-500 text-xs mt-2">
                Expected: FRES {scenario.expectedDeterminant} — {scenario.expectedName}
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
                  <li
                    key={i}
                    className="text-stone-100 text-sm leading-snug flex gap-2"
                  >
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
                  <li
                    key={i}
                    className="text-stone-100 text-sm leading-snug flex gap-2"
                  >
                    <span className="text-amber-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(parsed.caseEntry || parsed.keyMissed) && (
            <div className="rounded-2xl bg-stone-800 border border-stone-700 p-5 space-y-3">
              <div className="text-xs uppercase tracking-widest text-stone-400">
                Protocol Coverage
              </div>
              {parsed.caseEntry && (
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-emerald-400 mb-0.5">
                    Case Entry Covered
                  </div>
                  <div className="text-stone-200 text-sm">{parsed.caseEntry}</div>
                </div>
              )}
              {parsed.keyMissed && (
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-amber-400 mb-0.5">
                    Key Questions Missed
                  </div>
                  <div className="text-stone-200 text-sm">{parsed.keyMissed}</div>
                </div>
              )}
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
