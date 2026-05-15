// Achievement definitions and evaluation. Returns the list of IDs unlocked
// for a just-completed call given the session + history.

export const ACHIEVEMENTS = {
  first_call: { icon: "🎯", title: "First Call", desc: "Completed your first training call." },
  centurion: { icon: "💯", title: "Centurion", desc: "Scored a perfect 100." },
  perfect_code: { icon: "🎖️", title: "Perfect Code", desc: "Assigned the exact target EMD determinant." },
  speed_demon: { icon: "⚡", title: "Speed Demon", desc: "Case entry covered in 4 turns or fewer." },
  hard_mode_hero: { icon: "🔥", title: "Hard Mode Hero", desc: "Completed a Hard difficulty call." },
  hat_trick: { icon: "🎩", title: "Hat Trick", desc: "Three calls in a row scoring 80+." },
  category_collector: { icon: "🧭", title: "Category Collector", desc: "Completed calls across 3+ categories." },
  dispatcher_diploma: { icon: "🎧", title: "Dispatcher Diploma", desc: "Completed a Dispatcher-mode call." },
  bilingue: { icon: "🌎", title: "Bilingüe", desc: "Completed a Spanish-language scenario." },
  comeback_kid: { icon: "📞", title: "Comeback Kid", desc: "Survived a hang-up drill." },
};

export function evaluateAchievements({ score, emdCode, expectedDeterminant, mode, difficulty, scenario, history = [] }) {
  const unlocked = [];

  if (history.length === 0) unlocked.push("first_call");
  if (score >= 100) unlocked.push("centurion");
  if (emdCode && expectedDeterminant && emdCode.includes(expectedDeterminant)) unlocked.push("perfect_code");
  if (difficulty === "hard") unlocked.push("hard_mode_hero");
  if (mode === "dispatcher") unlocked.push("dispatcher_diploma");
  if (scenario?.spanishCaller) unlocked.push("bilingue");

  // Hat trick — last 2 + this one all ≥80.
  if (score >= 80 && history.length >= 2) {
    const last2 = history.slice(0, 2);
    if (last2.every((h) => typeof h.score === "number" && h.score >= 80)) {
      unlocked.push("hat_trick");
    }
  }

  // Category collector — combined unique categories across history + this call.
  const cats = new Set(history.map((h) => h.category).filter(Boolean));
  if (scenario?.category) cats.add(scenario.category);
  if (cats.size >= 3) unlocked.push("category_collector");

  return unlocked;
}
