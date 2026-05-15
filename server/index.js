import "dotenv/config";
import express from "express";
import compression from "compression";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { dispatcherSystemPrompt, feedbackPrompt } from "./prompts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PORT = parseInt(process.env.PORT || "8787", 10);
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "[warn] ANTHROPIC_API_KEY is not set. /api/chat and /api/feedback will fail until it's configured."
  );
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const app = express();
app.use(compression());
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

app.post("/api/chat", async (req, res) => {
  const { scenarioId, messages } = req.body || {};
  if (!scenarioId) {
    return res.status(400).json({ error: "scenarioId is required" });
  }
  const history = sanitizeMessages(messages);
  // If the conversation hasn't started yet, give Claude a nudge to open the call.
  const apiMessages =
    history.length === 0
      ? [{ role: "user", content: "(caller has just connected)" }]
      : history;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: [
        {
          type: "text",
          text: dispatcherSystemPrompt(scenarioId),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: apiMessages,
    });
    const reply =
      response.content
        ?.filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim() || "";
    res.json({ reply });
  } catch (err) {
    console.error("[chat] error:", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to reach dispatcher." });
  }
});

app.post("/api/feedback", async (req, res) => {
  const { scenarioId, messages } = req.body || {};
  if (!scenarioId) {
    return res.status(400).json({ error: "scenarioId is required" });
  }
  const history = sanitizeMessages(messages);
  if (history.length === 0) {
    return res.json({
      feedback:
        "OVERALL: You ended the call before saying anything — give it another try!\nWHAT YOU DID WELL:\n- You started the call\nWHAT TO REMEMBER NEXT TIME:\n- Stay on the line and answer the dispatcher's questions\nKEY TAKEAWAY: Take a breath and tell the dispatcher what's happening.",
    });
  }

  const transcript = history
    .map(
      (m) => `${m.role === "user" ? "Caller" : "Dispatcher"}: ${m.content}`
    )
    .join("\n");

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [
        { role: "user", content: feedbackPrompt(scenarioId, transcript) },
      ],
    });
    const feedback =
      response.content
        ?.filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim() || "";
    res.json({ feedback });
  } catch (err) {
    console.error("[feedback] error:", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to generate feedback." });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL });
});

// Production: serve the built frontend.
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
