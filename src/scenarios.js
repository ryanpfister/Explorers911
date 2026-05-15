export const SCENARIOS = [
  {
    id: "fall",
    title: "Someone Fell",
    brief: "Your friend fell off their bike and isn't moving",
    emoji: "🚲",
  },
  {
    id: "choking",
    title: "Choking",
    brief: "A family member is choking and can't breathe",
    emoji: "😰",
  },
  {
    id: "fire",
    title: "House Fire",
    brief: "You see smoke and flames in a neighbor's house",
    emoji: "🔥",
  },
  {
    id: "crash",
    title: "Car Crash",
    brief: "Two cars just crashed at the intersection near you",
    emoji: "🚗",
  },
];

export function scenarioById(id) {
  return SCENARIOS.find((s) => s.id === id) || null;
}
