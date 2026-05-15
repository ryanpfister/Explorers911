// In-memory live state for the projector / admin view.
// Single active session at a time — fine for one explorer post at a time.
// If you ever need concurrent sessions, swap this for a session-ID map.

const initialState = () => ({
  status: "idle", // idle | ringing | in-call | ended | feedback-ready
  scenarioId: null,
  startedAt: null,
  endedAt: null,
  messages: [],
  interim: "",
  callerStatus: null, // listening | thinking | speaking-dispatcher | null
  feedback: null,
  emdCode: null,
  expectedEmdCode: null,
  updatedAt: Date.now(),
});

let current = initialState();
const subscribers = new Set();

function broadcast() {
  current.updatedAt = Date.now();
  const payload = `data: ${JSON.stringify(current)}\n\n`;
  for (const res of subscribers) {
    try {
      res.write(payload);
    } catch {
      // ignore broken pipes
    }
  }
}

export function getState() {
  return current;
}

export function patchState(patch) {
  current = { ...current, ...patch };
  broadcast();
}

export function resetState() {
  current = initialState();
  broadcast();
}

export function subscribe(res) {
  subscribers.add(res);
  // Send the current snapshot immediately on connect.
  try {
    res.write(`data: ${JSON.stringify(current)}\n\n`);
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
