// Pushes incremental call state to the server per-session so the
// projector view (/admin) can mirror every kid's call in real time.

let sessionId = null;
let inFlight = null;
let pending = null;

export function newSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 12);
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function setSessionId(id) {
  sessionId = id;
}

export function getSessionId() {
  return sessionId;
}

async function flush() {
  if (inFlight || !pending || !sessionId) return;
  const payload = pending;
  const id = sessionId;
  pending = null;
  inFlight = fetch(`/api/admin/session/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .catch(() => {})
    .finally(() => {
      inFlight = null;
      if (pending) flush();
    });
}

export function reportAdmin(patch) {
  pending = { ...(pending || {}), ...patch };
  flush();
}

export function resetAdmin() {
  fetch("/api/admin/reset", { method: "POST" }).catch(() => {});
}

export function deleteSession(id) {
  fetch(`/api/admin/session/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch(() => {});
}
