// Pushes incremental call state to the server so the projector view
// (/admin) can mirror it in real time. Best-effort fire-and-forget.

let inFlight = null;
let pending = null;

async function flush() {
  if (inFlight || !pending) return;
  const payload = pending;
  pending = null;
  inFlight = fetch("/api/admin/state", {
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
