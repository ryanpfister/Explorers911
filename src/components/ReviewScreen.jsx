import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scenarioById } from "../scenarios.js";

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
    .map((c) => (PHONETIC[c] ? ` ${PHONETIC[c]} ` : c === "-" ? " " : c))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function dispatchTimeWords(ts) {
  const d = new Date(ts || Date.now());
  return `${d.getHours().toString().padStart(2, "0")}${d.getMinutes().toString().padStart(2, "0")} hours`;
}

function buildAnnouncementText(d) {
  const ageStr = d.age && d.age !== "unknown" && d.age !== "" ? `for a ${d.age} year old patient` : "for a patient";
  const codePart = d.code ? `, code ${phoneticCode(d.code)}` : "";
  const nature = d.nature ? `, ${d.nature}, ` : ", ";
  return `${d.department || "Suffolk County Fire Rescue"}, on the air with an EMS alarm${codePart}${nature}${ageStr} at ${d.location || "an unknown location"}. Time is now ${dispatchTimeWords(d.timestamp)}.`;
}

function parseFeedback(text, label) {
  if (!text) return "";
  const re = new RegExp(`^${label}\\s*:\\s*(.+)$`, "im");
  const m = text.match(re);
  return m ? m[1].trim() : "";
}

// Pick segments for one session: intro -> caller opener -> chief complaint exchange ->
// FRES dispatch (with tones) -> a pre-arrival exchange -> coach summary.
function buildSegments(session, index, total) {
  const scenario = session.scenarioId ? scenarioById(session.scenarioId) : null;
  const segs = [];

  segs.push({
    kind: "intro",
    title: `Call ${index + 1} of ${total}`,
    subtitle: scenario?.title || "Unknown scenario",
    body: scenario?.brief || "",
    speak: `Call ${index + 1} of ${total}. ${scenario?.title || ""}. ${scenario?.brief || ""}`,
    voice: "narrator",
  });

  const messages = session.messages || [];
  // First caller utterance after a FRES turn (the "real" call once FRES picked up)
  const firstFresIdx = messages.findIndex((m) => m.role === "assistant" && m.agent === "fres");
  const startIdx = firstFresIdx >= 0 ? firstFresIdx : 0;
  const callMsgs = messages.slice(startIdx);

  const firstCaller = callMsgs.find((m) => m.role === "user");
  if (firstCaller) {
    segs.push({
      kind: "caller",
      title: "Caller's opening",
      speak: firstCaller.content,
      voice: "caller",
      body: firstCaller.content,
    });
  }

  // First dispatcher reply after the opening
  const firstDisp = callMsgs.find((m) => m.role === "assistant" && m.agent !== "pd");
  if (firstDisp) {
    segs.push({
      kind: "dispatcher",
      title: "Fire Rescue",
      speak: firstDisp.content,
      voice: "dispatcher",
      body: firstDisp.content,
    });
  }

  // Radio dispatch with tones
  if (session.dispatch) {
    segs.push({
      kind: "dispatch",
      title: "Radio dispatch",
      body: `${session.dispatch.department || ""} — ${session.dispatch.code || ""} — ${session.dispatch.nature || ""} — age ${session.dispatch.age || "?"} at ${session.dispatch.location || ""}`,
      speak: buildAnnouncementText(session.dispatch),
      voice: "dispatcher",
      tones: true,
    });
  }

  // Last meaningful dispatcher line (likely a pre-arrival instruction or arrival)
  const lastDisp = [...callMsgs].reverse().find((m) => m.role === "assistant" && m.agent !== "pd");
  if (lastDisp && lastDisp !== firstDisp) {
    segs.push({
      kind: "dispatcher",
      title: "Pre-arrival / wrap",
      speak: lastDisp.content,
      voice: "dispatcher",
      body: lastDisp.content,
    });
  }

  // Coach summary
  if (session.feedback) {
    const overall = parseFeedback(session.feedback, "OVERALL");
    const takeaway = parseFeedback(session.feedback, "KEY TAKEAWAY");
    const code = session.emdCode || "Unable to code";
    const expected = scenario?.expectedDeterminant;
    const speakParts = [];
    if (overall) speakParts.push(`Coach's review: ${overall}`);
    if (code) {
      const expPart = expected ? ` Target was ${phoneticCode(expected)}.` : "";
      speakParts.push(`EMD code assigned: ${phoneticCode(code.replace(/—.*/, "").trim())}.${expPart}`);
    }
    if (takeaway) speakParts.push(`Key takeaway: ${takeaway}`);
    segs.push({
      kind: "summary",
      title: "Coach's review",
      body: {
        overall,
        takeaway,
        code,
        expected,
      },
      speak: speakParts.join(" "),
      voice: "narrator",
    });
  }

  segs.push({ kind: "pause", silent: true, durationMs: 1500 });
  return segs;
}

function pickVoices(voices) {
  if (!voices || voices.length === 0) return { narrator: null, dispatcher: null, caller: null };
  const en = voices.filter((v) => v.lang && /^en/i.test(v.lang));
  const pool = en.length ? en : voices;
  // Heuristic: rank by quality, then pick three distinct ones.
  const ranked = [...pool].sort((a, b) => {
    const score = (v) => {
      let s = 0;
      if (/Natural|Premium|Enhanced|Online/i.test(v.name)) s += 100;
      if (/Google|Microsoft/i.test(v.name)) s += 50;
      if (/^en-US/i.test(v.lang)) s += 10;
      return s;
    };
    return score(b) - score(a);
  });
  return {
    narrator: ranked[0] || null,
    dispatcher: ranked[1] || ranked[0] || null,
    caller: ranked[2] || ranked[0] || null,
  };
}

function playAlertTones() {
  if (typeof window === "undefined") return 0;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return 0;
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
  return 3300;
}

export default function ReviewScreen({ sessions, onClose }) {
  // Flatten into a sequence of (sessionIdx, segment) pairs.
  const flat = useMemo(() => {
    const arr = [];
    sessions.forEach((s, i) => {
      buildSegments(s, i, sessions.length).forEach((seg) => arr.push({ session: s, sessionIdx: i, segment: seg }));
    });
    return arr;
  }, [sessions]);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const voicesRef = useRef({ narrator: null, dispatcher: null, caller: null });
  const cancelRef = useRef(() => {});

  // Pick voices once loaded.
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const update = () => {
      voicesRef.current = pickVoices(window.speechSynthesis.getVoices());
    };
    update();
    window.speechSynthesis.onvoiceschanged = update;
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Play current segment whenever it changes (or playback resumes).
  useEffect(() => {
    if (!playing) {
      try { window.speechSynthesis?.cancel(); } catch {}
      return;
    }
    if (idx >= flat.length) return;
    let cancelled = false;
    let timer = null;
    const item = flat[idx];
    const seg = item.segment;

    function advance() {
      if (cancelled) return;
      setIdx((i) => Math.min(i + 1, flat.length));
    }

    async function run() {
      if (seg.silent) {
        timer = setTimeout(advance, seg.durationMs || 1200);
        return;
      }
      // Optional alert tones before this segment.
      if (seg.tones) {
        const waitMs = playAlertTones();
        await new Promise((r) => { timer = setTimeout(r, waitMs + 250); });
        if (cancelled) return;
      }
      if (!seg.speak || typeof window === "undefined" || !window.speechSynthesis) {
        timer = setTimeout(advance, 2200);
        return;
      }
      try { window.speechSynthesis.cancel(); } catch {}
      const u = new SpeechSynthesisUtterance(seg.speak);
      const v = voicesRef.current[seg.voice] || voicesRef.current.narrator;
      if (v) u.voice = v;
      // Caller is more rushed/higher; dispatcher steady; narrator clean.
      if (seg.voice === "caller") { u.rate = 1.05; u.pitch = 1.15; }
      else if (seg.voice === "dispatcher") { u.rate = 1.05; u.pitch = 0.95; }
      else { u.rate = 1.05; u.pitch = 1.0; }
      u.volume = 1.0;
      u.onend = () => { if (!cancelled) advance(); };
      u.onerror = () => { if (!cancelled) advance(); };
      // Small delay so cancellation settles cleanly.
      timer = setTimeout(() => {
        if (!cancelled) {
          try { window.speechSynthesis.speak(u); } catch { advance(); }
        }
      }, 80);
    }

    run();
    cancelRef.current = () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      try { window.speechSynthesis?.cancel(); } catch {}
    };
    return () => cancelRef.current();
  }, [idx, playing, flat]);

  const current = flat[idx];
  const finished = idx >= flat.length;

  const skipSession = useCallback(() => {
    if (!current) return;
    const target = current.sessionIdx + 1;
    const nextIdx = flat.findIndex((f) => f.sessionIdx === target);
    setIdx(nextIdx >= 0 ? nextIdx : flat.length);
  }, [flat, current]);

  const prevSession = useCallback(() => {
    if (!current) return;
    const target = Math.max(0, current.sessionIdx - 1);
    const nextIdx = flat.findIndex((f) => f.sessionIdx === target);
    setIdx(nextIdx >= 0 ? nextIdx : 0);
  }, [flat, current]);

  const handleClose = () => {
    try { window.speechSynthesis?.cancel(); } catch {}
    onClose();
  };

  if (flat.length === 0) {
    return (
      <div className="fixed inset-0 bg-stone-950 z-50 flex flex-col items-center justify-center text-stone-100 p-8">
        <div className="text-2xl font-bold mb-2">No completed calls to review.</div>
        <div className="text-stone-400 mb-6">Have explorers run at least one call first.</div>
        <button onClick={onClose} className="px-5 py-2.5 rounded-lg bg-stone-800 border border-stone-700 hover:bg-stone-700">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-stone-950 z-50 flex flex-col text-stone-100">
      {/* Header */}
      <div className="px-10 py-5 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <div className="text-red-500 text-4xl font-black tracking-tight">911</div>
          <div>
            <div className="text-stone-100 text-2xl font-bold leading-tight">Session Review</div>
            <div className="text-stone-400 text-sm">
              Call {(current?.sessionIdx ?? sessions.length - 1) + 1} of {sessions.length}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevSession} className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-sm">‹ Prev call</button>
          <button onClick={() => setPlaying((p) => !p)} className={`px-4 py-2 rounded-lg border font-bold ${playing ? "bg-amber-700 border-amber-600 hover:bg-amber-600" : "bg-emerald-700 border-emerald-600 hover:bg-emerald-600"}`}>
            {playing ? "⏸ Pause" : "▶ Resume"}
          </button>
          <button onClick={skipSession} className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-sm">Next call ›</button>
          <button onClick={handleClose} className="ml-4 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 border border-red-600 text-sm font-bold">
            Exit Review
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 py-8">
        {finished ? (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-3xl font-bold mb-2">All calls reviewed</div>
            <div className="text-stone-400 mb-6">Great work today.</div>
            <button onClick={handleClose} className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 font-bold">
              Close
            </button>
          </div>
        ) : (
          <ReviewStage item={current} />
        )}
      </div>

      {/* Footer / progress */}
      <div className="px-10 py-3 border-t border-stone-800">
        <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-300"
            style={{ width: `${(idx / Math.max(1, flat.length)) * 100}%` }}
          />
        </div>
        <div className="text-stone-500 text-xs mt-1.5 text-center">
          Segment {Math.min(idx + 1, flat.length)} of {flat.length}
        </div>
      </div>
    </div>
  );
}

function ReviewStage({ item }) {
  if (!item) return null;
  const { session, segment } = item;
  const scenario = session?.scenarioId ? scenarioById(session.scenarioId) : null;

  const kindStyles = {
    intro: { color: "text-stone-200", accent: "bg-stone-700", label: "Scenario" },
    caller: { color: "text-red-200", accent: "bg-red-700", label: "Caller" },
    dispatcher: { color: "text-sky-200", accent: "bg-sky-700", label: "Fire Rescue" },
    dispatch: { color: "text-amber-200", accent: "bg-amber-700", label: "📻 Radio Dispatch" },
    summary: { color: "text-emerald-200", accent: "bg-emerald-700", label: "Coach's Review" },
    pause: { color: "text-stone-500", accent: "bg-stone-700", label: "…" },
  };
  const style = kindStyles[segment.kind] || kindStyles.intro;

  return (
    <div className="w-full max-w-5xl">
      <div className="flex items-center gap-3 mb-4">
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-widest text-white ${style.accent}`}>
          {style.label}
        </span>
        {scenario && (
          <span className="text-stone-400 text-sm">
            {scenario.emoji} {scenario.title} · {scenario.location || ""}
          </span>
        )}
      </div>

      {segment.kind === "intro" && (
        <div className="rounded-3xl bg-stone-900 border border-stone-800 p-10">
          <div className="text-stone-500 text-sm uppercase tracking-widest mb-2">{segment.title}</div>
          <div className="text-stone-100 text-4xl font-black leading-tight mb-3">{segment.subtitle}</div>
          <div className="text-stone-300 text-lg leading-snug">{segment.body}</div>
        </div>
      )}

      {(segment.kind === "caller" || segment.kind === "dispatcher") && (
        <div className={`rounded-3xl bg-stone-900 border border-stone-800 p-10 ${style.color}`}>
          <div className="text-stone-500 text-xs uppercase tracking-widest mb-3">{segment.title}</div>
          <div className="text-3xl font-semibold leading-snug">{segment.body}</div>
        </div>
      )}

      {segment.kind === "dispatch" && (
        <div className="rounded-3xl bg-amber-950/40 border border-amber-800/60 p-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-4xl">📻</div>
            <div className="text-amber-300 text-xs uppercase tracking-widest font-bold">{segment.title}</div>
          </div>
          <div className="text-amber-100 text-2xl font-mono leading-snug">{segment.body}</div>
        </div>
      )}

      {segment.kind === "summary" && (
        <div className="rounded-3xl bg-stone-900 border border-stone-800 p-10 space-y-4">
          <div className="text-emerald-300 text-xs uppercase tracking-widest font-bold">{segment.title}</div>
          {segment.body.overall && (
            <div>
              <div className="text-stone-500 text-[11px] uppercase tracking-widest">Overall</div>
              <div className="text-stone-100 text-2xl leading-snug">{segment.body.overall}</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {segment.body.code && (
              <div>
                <div className="text-stone-500 text-[11px] uppercase tracking-widest">EMD Code Assigned</div>
                <div className="text-sky-300 font-mono text-xl">{segment.body.code}</div>
              </div>
            )}
            {segment.body.expected && (
              <div>
                <div className="text-stone-500 text-[11px] uppercase tracking-widest">Target</div>
                <div className="text-stone-300 font-mono text-xl">{segment.body.expected}</div>
              </div>
            )}
          </div>
          {segment.body.takeaway && (
            <div className="rounded-xl bg-red-950/30 border border-red-800/40 p-4">
              <div className="text-red-300 text-[11px] uppercase tracking-widest mb-1">Key Takeaway</div>
              <div className="text-stone-50 text-xl font-semibold leading-snug">{segment.body.takeaway}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
