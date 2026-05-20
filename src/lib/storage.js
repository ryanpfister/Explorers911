// Per-explorer local history + personal bests. Keyed by lowercase name.

const KEY_PREFIX = "explorers911:history:";
const ACHIEVE_PREFIX = "explorers911:achievements:";

function safeKey(name) {
  return (name || "").trim().toLowerCase();
}

export function getHistory(name) {
  const k = safeKey(name);
  if (!k || typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY_PREFIX + k) || "[]");
  } catch {
    return [];
  }
}

export function addHistoryEntry(name, entry) {
  const k = safeKey(name);
  if (!k || typeof localStorage === "undefined") return;
  const list = getHistory(name);
  list.unshift({ ...entry, timestamp: Date.now() });
  // Keep last 50.
  try {
    localStorage.setItem(KEY_PREFIX + k, JSON.stringify(list.slice(0, 50)));
  } catch {
    // ignore quota
  }
}

export function personalBest(name) {
  const list = getHistory(name);
  return list.reduce((best, e) => (typeof e.score === "number" && e.score > (best || 0) ? e.score : best), 0);
}

export function getAchievements(name) {
  const k = safeKey(name);
  if (!k || typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ACHIEVE_PREFIX + k) || "[]");
  } catch {
    return [];
  }
}

export function addAchievement(name, id) {
  const k = safeKey(name);
  if (!k || typeof localStorage === "undefined") return false;
  const have = new Set(getAchievements(name));
  if (have.has(id)) return false;
  have.add(id);
  try {
    localStorage.setItem(ACHIEVE_PREFIX + k, JSON.stringify([...have]));
  } catch {
    // ignore
  }
  return true;
}
