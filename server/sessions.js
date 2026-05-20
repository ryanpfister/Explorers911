// Multi-session in-memory state for the projector / admin view.
// Each kid's phone mints a session id and patches it; the projector
// subscribes via SSE and renders the whole map.

const SESSION_TTL_MS = 10 * 60 * 1000; // drop ended sessions after 10 min

const sessions = new Map();
const subscribers = new Set();

function snapshot() {
  return { sessions: Object.fromEntries(sessions) };
}

function broadcast() {
  const payload = `data: ${JSON.stringify(snapshot())}\n\n`;
  for (const res of subscribers) {
    try {
      res.write(payload);
    } catch {
      // ignore
    }
  }
}

function newSession(id) {
  return {
    id,
    status: "idle",
    scenarioId: null,
    startedAt: null,
    endedAt: null,
    messages: [],
    interim: "",
    callerStatus: null,
    feedback: null,
    emdCode: null,
    expectedEmdCode: null,
    updatedAt: Date.now(),
  };
}

export function patchSession(id, patch) {
  if (!id) return null;
  const existing = sessions.get(id) || newSession(id);
  const merged = { ...existing, ...patch, id, updatedAt: Date.now() };
  sessions.set(id, merged);
  broadcast();
  return merged;
}

export function getSession(id) {
  return sessions.get(id) || null;
}

export function getAllSessions() {
  return snapshot();
}

export function deleteSession(id) {
  if (sessions.delete(id)) broadcast();
}

export function resetAll() {
  sessions.clear();
  broadcast();
}

export function subscribe(res) {
  subscribers.add(res);
  try {
    res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
  } catch {
    // ignore
  }
  return () => subscribers.delete(res);
}

export function heartbeat() {
  for (const res of subscribers) {
    try {
      res.write(`: ping\n\n`);
    } catch {
      // ignore
    }
  }
}

function gc() {
  const now = Date.now();
  let changed = false;
  for (const [id, s] of sessions) {
    const cutoff = s.endedAt || s.updatedAt;
    if (now - cutoff > SESSION_TTL_MS) {
      sessions.delete(id);
      changed = true;
    }
  }
  if (changed) broadcast();
}

setInterval(gc, 60_000);
