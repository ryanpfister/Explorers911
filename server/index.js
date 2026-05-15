import "dotenv/config";
import express from "express";
import compression from "compression";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { dispatcherSystemPrompt, feedbackPrompt, SCENARIO_META } from "./prompts.js";
import {
  patchSession,
  deleteSession,
  resetAll,
  subscribe,
  heartbeat,
  getAllSessions,
} from "./sessions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PORT = parseInt(process.env.PORT || "8787", 10);
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";

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
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .slice(-40);
}

function formatHistoryAsPrompt(history) {
  if (history.length === 0) {
    return "(The caller has just connected. Open the call now with your first line.)";
  }
  const lines = history.map((m) =>
    m.role === "user"
      ? `CALLER: ${m.content}`
      : `YOU (dispatcher, earlier line): ${m.content}`
  );
  const turnCount = history.filter((m) => m.role === "assistant").length;
  const endCallHint =
    turnCount >= 10
      ? " Append [END_CALL] to this response if you have already dispatched units, given at least two pre-arrival instructions, AND told the caller to stay on the line."
      : "";
  lines.push(
    "",
    `Respond with your next dispatcher line ONLY (1-2 short sentences, no prefix, no quotes).${endCallHint}`
  );
  return lines.join("\n");
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
  const { scenarioId, messages } = req.body || {};
  if (!scenarioId) {
    return res.status(400).json({ error: "scenarioId is required" });
  }
  const history = sanitizeMessages(messages);

  try {
    const reply = await runQuery({
      systemPrompt: dispatcherSystemPrompt(scenarioId),
      userPrompt: formatHistoryAsPrompt(history),
    });
    res.json({ reply });
  } catch (err) {
    console.error("[chat] error:", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to reach dispatcher." });
  }
});

app.post("/api/feedback", async (req, res) => {
  const { scenarioId, messages, sessionId } = req.body || {};
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
    .map((m) => `${m.role === "user" ? "Caller" : "Dispatcher"}: ${m.content}`)
    .join("\n");

  try {
    const feedback = await runQuery({
      systemPrompt:
        "You are a friendly coach reviewing a Suffolk County FRES 911 training call for a youth explorer (12-17). Follow the user's formatting instructions exactly. Stay encouraging and specific.",
      userPrompt: feedbackPrompt(scenarioId, transcript),
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
  res.json({ ok: true });
});

app.get("/api/admin/state", (_req, res) => {
  res.json(getAllSessions());
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
