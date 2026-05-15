import "dotenv/config";
import express from "express";
import compression from "compression";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { query } from "@anthropic-ai/claude-agent-sdk";
import {
  dispatcherSystemPrompt,
  pdDispatcherSystemPrompt,
  callerSystemPrompt,
  feedbackPrompt,
  SCENARIO_META,
} from "./prompts.js";
import {
  patchSession,
  deleteSession,
  resetAll,
  subscribe,
  heartbeat,
  getAllSessions,
  getSession,
} from "./sessions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PORT = parseInt(process.env.PORT || "8787", 10);
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";
const RECORDINGS_DIR = path.join(ROOT, "recordings");
fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

function safeSessionId(id) {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

const app = express();
app.use(compression({ filter: (req) => !req.path.startsWith("/api/admin/stream") }));
app.use(express.json({ limit: "256kb" }));

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim(),
      ...(m.agent ? { agent: m.agent } : {}),
    }))
    .slice(-40);
}

function labelAssistant(m, currentAgent, mode) {
  if (m.agent === "pd") return `POLICE DISPATCHER (earlier): ${m.content}`;
  if (m.agent === "fres") return `FIRE RESCUE DISPATCHER (you, earlier line): ${m.content}`;
  if (m.agent === "caller" || mode === "dispatcher") {
    return `CALLER (you, earlier line): ${m.content}`;
  }
  if (currentAgent === "fres") return `FIRE RESCUE DISPATCHER (you, earlier line): ${m.content}`;
  return `YOU (dispatcher, earlier line): ${m.content}`;
}

function formatHistoryAsPrompt(history, opts = {}) {
  const { agent = "fres", mode = "caller" } = opts;

  if (history.length === 0) {
    if (mode === "dispatcher") {
      return "(The Fire Rescue line just lit up — a transferred 911 call. The dispatcher hasn't greeted you yet. If they have already spoken, respond as the panicked caller; otherwise wait.)";
    }
    if (agent === "pd") {
      return "(A 911 call has just connected to your police-dispatch console. Open with your first line.)";
    }
    if (agent === "fres") {
      return "(SCPD just transferred this caller to you on a three-way line. Open by greeting the caller as Fire Rescue.)";
    }
    return "(The caller has just connected. Open with your first line.)";
  }

  const lines = history.map((m) => {
    if (m.role === "user") {
      return mode === "dispatcher" ? `DISPATCHER: ${m.content}` : `CALLER: ${m.content}`;
    }
    return labelAssistant(m, agent, mode);
  });

  const turnCount = history.filter((m) => m.role === "assistant").length;

  let finalInstruction;
  if (mode === "dispatcher") {
    const endHint =
      turnCount >= 6
        ? " If the dispatcher just told you units are arriving on scene, thank them and append [END_CALL]."
        : "";
    finalInstruction = `Respond as the panicked caller with your next line ONLY (1-2 short sentences, no prefix, no quotes).${endHint}`;
  } else if (agent === "pd") {
    finalInstruction = "Respond with your next police-dispatch triage line ONLY (1 short sentence, no prefix, no quotes). Append [TRANSFER] if you're now handing off to Fire Rescue.";
  } else {
    const endHint =
      turnCount >= 7
        ? " If you have already dispatched units AND given at least one pre-arrival instruction, your next response should announce that crews are arriving on scene now (e.g. 'I can hear the sirens — crews are pulling up now.') and append [END_CALL]."
        : "";
    finalInstruction = `Respond with your next dispatcher line ONLY (1-2 short sentences, no prefix, no quotes).${endHint}`;
  }

  lines.push("", finalInstruction);
  return lines.join("\n");
}

function parseDispatchTag(text) {
  if (!text) return null;
  const match = text.match(/\[DISPATCH:([^\]]+)\]/);
  if (!match) return null;
  const fields = {};
  for (const pair of match[1].split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim().toLowerCase();
    const val = pair.slice(idx + 1).trim();
    if (key && val) fields[key] = val;
  }
  if (Object.keys(fields).length === 0) return null;
  return {
    department: fields.dept || fields.department || "Suffolk County Fire Rescue",
    code: fields.code || "",
    nature: fields.nature || "",
    age: fields.age || "unknown",
    location: fields.location || "",
    timestamp: Date.now(),
  };
}

function stripControlTags(text) {
  return text.replace(/\[DISPATCH:[^\]]+\]/g, "").trim();
}

async function runQuery({ systemPrompt, userPrompt }) {
  const result = query({
    prompt: userPrompt,
    options: {
      model: MODEL,
      systemPrompt,
      allowedTools: [],
      permissionMode: "bypassPermissions",
      settingSources: [],
      maxTurns: 1,
    },
  });

  let text = "";
  for await (const msg of result) {
    if (msg.type === "assistant" && msg.message?.content) {
      for (const block of msg.message.content) {
        if (block.type === "text") text += block.text;
      }
    }
    if (msg.type === "result" && msg.subtype === "error_during_execution") {
      throw new Error(msg.error || "Claude Agent SDK error");
    }
  }
  return text.trim();
}

function extractEmdCode(feedback) {
  if (!feedback) return null;
  const match = feedback.match(/EMD CODE:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

app.post("/api/chat", async (req, res) => {
  const {
    scenarioId,
    messages,
    dispatcher,
    pd,
    agent = "fres",
    mode = "caller",
    sessionId,
    callerName,
    difficulty = "medium",
  } = req.body || {};
  if (!scenarioId) {
    return res.status(400).json({ error: "scenarioId is required" });
  }
  const history = sanitizeMessages(messages);

  let systemPrompt;
  if (mode === "dispatcher") {
    systemPrompt = callerSystemPrompt(scenarioId, { difficulty, callerName });
  } else if (agent === "pd") {
    systemPrompt = pdDispatcherSystemPrompt(scenarioId, pd, callerName);
  } else {
    const postTransfer = history.some((m) => m.agent === "pd");
    systemPrompt = dispatcherSystemPrompt(scenarioId, dispatcher, { postTransfer, callerName });
  }

  try {
    const reply = await runQuery({
      systemPrompt,
      userPrompt: formatHistoryAsPrompt(history, { agent, mode }),
    });
    // Extract [DISPATCH:...] from FRES dispatcher replies and broadcast to admin.
    // Only the FIRST dispatch for a session is stored — if the AI re-emits the tag
    // in a later turn it would generate a new timestamp and re-trigger the admin announcement.
    if (mode === "caller" && agent === "fres" && sessionId) {
      const dispatchInfo = parseDispatchTag(reply);
      if (dispatchInfo) {
        const existing = getSession(sessionId);
        if (!existing?.dispatch) {
          patchSession(sessionId, { dispatch: dispatchInfo });
        }
      }
    }
    res.json({ reply });
  } catch (err) {
    console.error("[chat] error:", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to reach dispatcher." });
  }
});

app.post("/api/feedback", async (req, res) => {
  const { scenarioId, messages, sessionId, mode = "caller" } = req.body || {};
  if (!scenarioId) {
    return res.status(400).json({ error: "scenarioId is required" });
  }
  const history = sanitizeMessages(messages);

  if (history.length === 0) {
    const empty =
      "OVERALL: You ended the call before saying anything — give it another try!\nWHAT YOU DID WELL:\n- You started the call\nWHAT TO REMEMBER NEXT TIME:\n- Stay on the line and answer the dispatcher's questions\nKEY TAKEAWAY: Take a breath and tell the dispatcher what's happening.\nEMD CODE: Unable to code — insufficient info from caller";
    if (sessionId) {
      patchSession(sessionId, {
        feedback: empty,
        emdCode: "Unable to code",
        status: "feedback-ready",
      });
    }
    return res.json({ feedback: empty });
  }

  const transcript = history
    .map((m) => {
      if (mode === "dispatcher") {
        return m.role === "user"
          ? `Dispatcher (youth): ${m.content}`
          : `Caller (AI): ${m.content}`;
      }
      const label =
        m.role === "user"
          ? "Caller"
          : m.agent === "pd"
            ? "Police Dispatcher"
            : "Fire Rescue Dispatcher";
      return `${label}: ${m.content}`;
    })
    .join("\n");

  try {
    const feedback = await runQuery({
      systemPrompt:
        "You are a friendly coach reviewing a Suffolk County FRES 911 training call for a youth explorer (12-17). Follow the user's formatting instructions exactly. Stay encouraging and specific.",
      userPrompt: feedbackPrompt(scenarioId, transcript, mode),
    });
    const emdCode = extractEmdCode(feedback);
    if (sessionId) {
      patchSession(sessionId, {
        feedback,
        emdCode,
        status: "feedback-ready",
      });
    }
    res.json({ feedback });
  } catch (err) {
    console.error("[feedback] error:", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to generate feedback." });
  }
});

// ─── Admin / projector view ─────────────────────────────────────────────

const PATCHABLE = [
  "status",
  "scenarioId",
  "startedAt",
  "endedAt",
  "messages",
  "interim",
  "callerStatus",
  "feedback",
  "emdCode",
  "expectedEmdCode",
  "callerName",
  "mode",
  "dispatch",
  "agent",
  "difficulty",
  "hasRecording",
];

app.post("/api/admin/session/:id", (req, res) => {
  const { id } = req.params;
  if (!id || id.length > 64) {
    return res.status(400).json({ error: "invalid session id" });
  }
  const patch = req.body || {};
  const clean = {};
  for (const k of PATCHABLE) {
    if (k in patch) clean[k] = patch[k];
  }
  if (clean.scenarioId && SCENARIO_META[clean.scenarioId]) {
    clean.expectedEmdCode = SCENARIO_META[clean.scenarioId].expectedDeterminant;
  }
  patchSession(id, clean);
  res.json({ ok: true });
});

app.delete("/api/admin/session/:id", (req, res) => {
  deleteSession(req.params.id);
  res.json({ ok: true });
});

app.post("/api/admin/reset", (_req, res) => {
  resetAll();
  // Also drop recordings.
  try {
    for (const f of fs.readdirSync(RECORDINGS_DIR)) {
      if (f.endsWith(".webm")) fs.unlinkSync(path.join(RECORDINGS_DIR, f));
    }
  } catch (e) {
    console.error("[recording] reset cleanup error:", e);
  }
  res.json({ ok: true });
});

app.get("/api/admin/state", (_req, res) => {
  res.json(getAllSessions());
});

// Voice recording upload + serve — raw webm blobs, keyed by session id.
app.post(
  "/api/recording/:id",
  express.raw({ type: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"], limit: "64mb" }),
  (req, res) => {
    const { id } = req.params;
    if (!safeSessionId(id)) return res.status(400).json({ error: "invalid session id" });
    if (!req.body || !req.body.length) return res.status(400).json({ error: "empty body" });
    const file = path.join(RECORDINGS_DIR, `${id}.webm`);
    fs.writeFile(file, req.body, (err) => {
      if (err) {
        console.error("[recording] write error:", err);
        return res.status(500).json({ error: "write failed" });
      }
      patchSession(id, { hasRecording: true });
      res.json({ ok: true, bytes: req.body.length });
    });
  }
);

app.get("/api/recording/:id", (req, res) => {
  const { id } = req.params;
  if (!safeSessionId(id)) return res.status(400).end();
  const file = path.join(RECORDINGS_DIR, `${id}.webm`);
  fs.access(file, fs.constants.R_OK, (err) => {
    if (err) return res.status(404).end();
    res.sendFile(file);
  });
});

app.get("/api/admin/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`retry: 3000\n\n`);
  const unsubscribe = subscribe(res);
  req.on("close", () => {
    unsubscribe();
    try {
      res.end();
    } catch {
      // ignore
    }
  });
});

setInterval(heartbeat, 25_000);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL });
});

if (process.env.NODE_ENV === "production") {
  const distDir = path.join(ROOT, "dist");
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT} (model: ${MODEL})`);
});
