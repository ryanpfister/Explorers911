// Suffolk County FRES EMD-coded training scenarios.
// `expectedDeterminant` is the Suffolk County FRES code we'd expect the
// dispatcher to land on once the caller provides full info.

export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "medical", label: "Medical" },
  { id: "fire", label: "Fire / Burns" },
  { id: "traffic", label: "Traffic" },
  { id: "water", label: "Water" },
  { id: "police", label: "Police" },
];

export const SCENARIOS = [
  // ─── Medical ────────────────────────────────────────────────────────────
  {
    id: "asthma_grandma",
    title: "Asthma Attack",
    category: "medical",
    emdCard: 6,
    emdName: "Respiratory / Breathing Problems",
    expectedDeterminant: "6-D-2A",
    expectedName: "Difficulty Speaking Between Breaths — Asthma",
    difficulty: "medium",
    brief:
      "Your grandma is having a bad asthma attack. She's wheezing badly and can barely get a word out between breaths. Her inhaler isn't helping. You're at her apartment in Middle Island.",
    location: "Middle Island",
    emoji: "🫁",
  },
  {
    id: "cardiac_arrest_grandpa",
    title: "Grandpa Collapsed",
    category: "medical",
    emdCard: 9,
    emdName: "Cardiac / Respiratory Arrest",
    expectedDeterminant: "9-E-1",
    expectedName: "Not Breathing At All",
    difficulty: "hard",
    brief:
      "Your grandpa just collapsed in the living room. He's not moving, his eyes are closed, and you can't see his chest moving. You're at home in Middle Island.",
    location: "Middle Island",
    emoji: "💔",
  },
  {
    id: "chest_pain_dad",
    title: "Chest Pain",
    category: "medical",
    emdCard: 10,
    emdName: "Chest Pain (Non-Traumatic)",
    expectedDeterminant: "10-D-4",
    expectedName: "Clammy or Cold Sweats",
    difficulty: "medium",
    brief:
      "Your dad is 52, clutching his chest, breaking out in a cold sweat, and says it feels like an elephant is sitting on him. You're at home in Middle Island.",
    location: "Middle Island",
    emoji: "❤️",
  },
  {
    id: "choking_sister",
    title: "Sister Choking",
    category: "medical",
    emdCard: 11,
    emdName: "Choking",
    expectedDeterminant: "11-D-1F",
    expectedName: "Partial Obstruction — Food",
    difficulty: "medium",
    brief:
      "Your 6-year-old sister was eating a hot dog and now she's grabbing her throat, making weird sounds, and can't talk. You're at home in Middle Island.",
    location: "Middle Island",
    emoji: "😰",
  },
  {
    id: "seizure_friend",
    title: "Friend Seizing",
    category: "medical",
    emdCard: 12,
    emdName: "Convulsions / Seizures",
    expectedDeterminant: "12-D-2",
    expectedName: "Continuous or Multiple Seizures",
    difficulty: "medium",
    brief:
      "Your friend just dropped to the floor at school and is shaking all over. It's been going for more than a minute. You're in the cafeteria at school in Middle Island.",
    location: "Middle Island",
    emoji: "⚡",
  },
  {
    id: "diabetic_aunt",
    title: "Diabetic Emergency",
    category: "medical",
    emdCard: 13,
    emdName: "Diabetic Problems",
    expectedDeterminant: "13-C-2",
    expectedName: "Abnormal Behavior",
    difficulty: "medium",
    brief:
      "Your aunt has diabetes. She's sweating, confused, slurring her words, and not making sense. You're at her apartment in Middle Island.",
    location: "Middle Island",
    emoji: "🩸",
  },
  {
    id: "fall_bike",
    title: "Bike Crash",
    category: "medical",
    emdCard: 17,
    emdName: "Falls",
    expectedDeterminant: "17-D-3G",
    expectedName: "Unconscious — On the Ground",
    difficulty: "easy",
    brief:
      "Your friend just wiped out on their bike going down a steep hill. They're lying on the pavement not moving and their helmet is cracked. You're on a bike path in Middle Island.",
    location: "Middle Island",
    emoji: "🚲",
  },
  {
    id: "cut_dad",
    title: "Bad Cut",
    category: "medical",
    emdCard: 21,
    emdName: "Bleeding / Lacerations",
    expectedDeterminant: "21-B-2T",
    expectedName: "Serious Hemorrhage — Trauma",
    difficulty: "medium",
    brief:
      "Your dad cut his hand badly while slicing a bagel. Blood is soaking through the kitchen towels, and he's starting to look pale. You're at home in Middle Island.",
    location: "Middle Island",
    emoji: "🩹",
  },
  {
    id: "allergic_bee",
    title: "Bee Sting Reaction",
    category: "medical",
    emdCard: 2,
    emdName: "Allergies / Envenomation",
    expectedDeterminant: "2-D-2",
    expectedName: "Difficulty Speaking Between Breaths",
    difficulty: "medium",
    brief:
      "Your friend got stung by a bee and now their face is swelling up, they're wheezing, and they can barely get a word out. They don't have an EpiPen. You're at Cathedral Pines County Park in Middle Island.",
    location: "Middle Island (Cathedral Pines County Park)",
    emoji: "🐝",
  },
  {
    id: "stroke_grandma",
    title: "Stroke Signs",
    category: "medical",
    emdCard: 28,
    emdName: "Stroke (CVA) / TIA",
    expectedDeterminant: "28-C-5F",
    expectedName: "Sudden Facial Droop — Strong Evidence < 2 hrs",
    difficulty: "medium",
    brief:
      "Your grandma's face is drooping on one side, her left arm feels weak, and her speech is slurred. It started about 20 minutes ago. You're at her house in Middle Island.",
    location: "Middle Island",
    emoji: "🧠",
  },
  {
    id: "unconscious_mom",
    title: "Mom Passed Out",
    category: "medical",
    emdCard: 31,
    emdName: "Unconscious / Fainting",
    expectedDeterminant: "31-D-2",
    expectedName: "Unconscious — Effective Breathing",
    difficulty: "medium",
    brief:
      "Your mom just passed out on the kitchen floor and isn't waking up, but you can see her chest moving so she's breathing. You're at home in Middle Island.",
    location: "Middle Island",
    emoji: "😵",
  },
  {
    id: "heat_football",
    title: "Heat Emergency",
    category: "medical",
    emdCard: 20,
    emdName: "Heat / Cold Exposure",
    expectedDeterminant: "20-D-1H",
    expectedName: "Not Alert — Heat Exposure",
    difficulty: "medium",
    brief:
      "It's a hot August practice and your teammate just collapsed on the field. He's hot to the touch, not really responding, and very confused. You're at the high school field in Middle Island.",
    location: "Middle Island",
    emoji: "🥵",
  },

  // ─── Fire / Burns ──────────────────────────────────────────────────────
  {
    id: "house_fire_neighbor",
    title: "House Fire",
    category: "fire",
    emdCard: 7,
    emdName: "Burns / Fire / Explosion",
    expectedDeterminant: "7-C-1F",
    expectedName: "Fire With Persons Reported Inside",
    difficulty: "easy",
    brief:
      "Thick black smoke and flames are coming out of your neighbor's upstairs window. Their car is in the driveway so you think they're home. You're outside in Middle Island.",
    location: "Middle Island",
    emoji: "🔥",
  },
  {
    id: "kitchen_grease_fire",
    title: "Kitchen Grease Fire",
    category: "fire",
    emdCard: 7,
    emdName: "Burns / Fire / Explosion",
    expectedDeterminant: "7-A-1F",
    expectedName: "Burns < 18% Body Area — Fire Present",
    difficulty: "medium",
    brief:
      "A pan of oil caught fire on the stove. Flames are spreading to the cabinets, and your mom burned her arm trying to move the pan. You're at home in Middle Island.",
    location: "Middle Island",
    emoji: "🍳",
  },
  {
    id: "co_alarm_brother",
    title: "Carbon Monoxide Alarm",
    category: "fire",
    emdCard: 8,
    emdName: "CO / Inhalation / HazMat",
    expectedDeterminant: "8-C-1M",
    expectedName: "Alert with Difficulty Breathing — Carbon Monoxide",
    difficulty: "medium",
    brief:
      "Your CO detector has been blaring for ten minutes. Your little brother says his head hurts and he's dizzy, and now he's having a hard time catching his breath. You're at home in Middle Island.",
    location: "Middle Island",
    emoji: "🚨",
  },

  // ─── Traffic ───────────────────────────────────────────────────────────
  {
    id: "car_crash_intersection",
    title: "Car Crash",
    category: "traffic",
    emdCard: 29,
    emdName: "Traffic / Transportation Incidents",
    expectedDeterminant: "29-D-3",
    expectedName: "High Velocity Impact",
    difficulty: "medium",
    brief:
      "Two cars just crashed hard at the intersection in front of you. Airbags went off, one driver is out of the car staggering, and another person is still in the second car not moving. You're at Middle Country Road and Bartlett Road in Middle Island.",
    location: "Middle Island (Middle Country Rd & Bartlett Rd)",
    emoji: "🚗",
  },
  {
    id: "pedestrian_struck",
    title: "Pedestrian Struck",
    category: "traffic",
    emdCard: 29,
    emdName: "Traffic / Transportation Incidents",
    expectedDeterminant: "29-D-2M",
    expectedName: "High Mechanism — Auto vs Pedestrian",
    difficulty: "hard",
    brief:
      "A car just hit a person in the crosswalk and kept going. The person is lying in the road and not moving. You're at Middle Country Road and Yaphank Avenue in Middle Island.",
    location: "Middle Island (Middle Country & Yaphank)",
    emoji: "🚶",
  },
  {
    id: "bike_vs_car",
    title: "Bike Hit by Car",
    category: "traffic",
    emdCard: 29,
    emdName: "Traffic / Transportation Incidents",
    expectedDeterminant: "29-D-2L",
    expectedName: "High Mechanism — Bicycle vs Auto",
    difficulty: "medium",
    brief:
      "Your friend was riding their bike home and got hit by a car. They're on the side of the road, awake but bleeding from their head and saying their leg really hurts. You're on Middle Country Road in Middle Island.",
    location: "Middle Island (Middle Country Rd)",
    emoji: "🚴",
  },

  // ─── Water (Suffolk County coastal) ────────────────────────────────────
  {
    id: "drowning_beach",
    title: "Drowning at the Beach",
    category: "water",
    emdCard: 14,
    emdName: "Drowning / Diving / SCUBA",
    expectedDeterminant: "14-E-1",
    expectedName: "Arrest (Out of Water)",
    difficulty: "hard",
    brief:
      "Someone went under at Artist Lake and a lifeguard just dragged them onto the sand. They're not breathing and not moving — the lifeguard is starting CPR.",
    location: "Artist Lake, Middle Island",
    emoji: "🌊",
  },
  // ─── Additional scenarios ─────────────────────────────────────────────
  {
    id: "elderly_fall_storm",
    title: "Elderly Fall in Snowstorm",
    category: "medical",
    emdCard: 17,
    emdName: "Falls",
    expectedDeterminant: "17-D-3G",
    expectedName: "Long Fall / Dangerous Body Area — Elderly",
    difficulty: "hard",
    brief:
      "Your grandfather slipped on the icy driveway during a snowstorm. He can't get up, says his hip hurts badly, and you can see his leg looks bent wrong. It's freezing outside.",
    location: "Middle Island",
    emoji: "🥶",
  },
  {
    id: "electrocution_dad",
    title: "Electrocution in Basement",
    category: "medical",
    emdCard: 15,
    emdName: "Electrocution / Lightning",
    expectedDeterminant: "15-D-1",
    expectedName: "Not Alert",
    difficulty: "hard",
    brief:
      "Your dad was changing a basement light fixture and got electrocuted. He's on the floor, not really responding. The breaker tripped. You're at home in Middle Island.",
    location: "Middle Island",
    emoji: "⚡",
  },
  {
    id: "school_bus_crash",
    title: "School Bus Crash",
    category: "traffic",
    emdCard: 29,
    emdName: "Traffic / Transportation Incidents",
    expectedDeterminant: "29-D-1",
    expectedName: "Multiple Patients",
    difficulty: "hard",
    brief:
      "A school bus and a pickup truck collided at the intersection. Kids are crying inside the bus, one is bleeding from the head, two adults on the road aren't moving. You're at Middle Country Road and Nicolls Road, Middle Island.",
    location: "Middle Island",
    emoji: "🚌",
  },
  {
    id: "spanish_chest_pain",
    title: "Chest Pain — Spanish Caller",
    category: "medical",
    emdCard: 10,
    emdName: "Chest Pain (Non-Traumatic)",
    expectedDeterminant: "10-D-4",
    expectedName: "Clammy + Heart Problems",
    difficulty: "hard",
    brief:
      "Your tío (uncle) is clutching his chest, sweating cold, can barely speak. He doesn't speak English — you're translating. You're at his house in Middle Island.",
    location: "Middle Island",
    emoji: "🇪🇸",
    spanishCaller: true,
  },
  {
    id: "spanish_choking",
    title: "Niño Atorado (Choking) — Spanish",
    category: "medical",
    emdCard: 11,
    emdName: "Choking",
    expectedDeterminant: "11-D-1F",
    expectedName: "Complete Obstruction — Food",
    difficulty: "hard",
    brief:
      "Tu primito (little cousin), 4 años, está atorado con un pedazo de pan. No puede toser ni hablar. Está en casa de tu abuela en Middle Island. Mom only speaks Spanish — you're helping.",
    location: "Middle Island",
    emoji: "🇪🇸",
    spanishCaller: true,
  },
  {
    id: "suicidal_caller",
    title: "Suicidal Caller (PD Only)",
    category: "police",
    emdCard: 25,
    emdName: "Psychiatric / Abnormal Behavior / Suicide Attempt",
    expectedDeterminant: "25-D-3",
    expectedName: "High Risk — Threatening Suicide",
    difficulty: "hard",
    brief:
      "A friend called you crying and said they're going to hurt themselves. They're alone at home in Middle Island. They sound serious — this is a police-only call (FRES will not respond).",
    location: "Middle Island",
    emoji: "🆘",
    pdOnly: true,
  },
];

export function scenarioById(id) {
  return SCENARIOS.find((s) => s.id === id) || null;
}

export function difficultyColor(d) {
  switch (d) {
    case "easy":
      return "text-emerald-300 border-emerald-700/60";
    case "medium":
      return "text-amber-300 border-amber-700/60";
    case "hard":
      return "text-red-300 border-red-700/60";
    default:
      return "text-stone-300 border-stone-700";
  }
}
