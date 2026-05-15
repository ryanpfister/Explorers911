// Scenario briefs and IAED-style protocol prompts for the Suffolk County
// FRES 911 dispatcher simulation. Keep this file in sync with
// src/scenarios.js — the front-end scenario list is the source of truth.

export const SCENARIO_META = {
  asthma_grandma: {
    brief:
      "The caller's grandma is having a bad asthma attack. She's wheezing, struggling to speak between breaths, and her inhaler isn't helping. Location: an apartment in Patchogue.",
    emdCard: 6,
    emdName: "Respiratory / Breathing Problems",
    expectedDeterminant: "6-D-2A",
  },
  cardiac_arrest_grandpa: {
    brief:
      "The caller's grandpa just collapsed in the living room. Not moving, eyes closed, no visible chest rise. Location: home in Bay Shore.",
    emdCard: 9,
    emdName: "Cardiac / Respiratory Arrest",
    expectedDeterminant: "9-E-1",
  },
  chest_pain_dad: {
    brief:
      "The caller's 52-year-old father is clutching his chest, breaking out in a cold sweat, says it feels like an elephant on his chest. Location: home in Smithtown.",
    emdCard: 10,
    emdName: "Chest Pain (Non-Traumatic)",
    expectedDeterminant: "10-D-4",
  },
  choking_sister: {
    brief:
      "The caller's 6-year-old sister was eating a hot dog and is now grabbing her throat, making weird sounds, cannot talk. Location: home in Brentwood.",
    emdCard: 11,
    emdName: "Choking",
    expectedDeterminant: "11-D-1F",
  },
  seizure_friend: {
    brief:
      "The caller's friend at school dropped to the floor and is actively shaking — the seizure has been going for more than a minute. Location: cafeteria of a school in Sayville.",
    emdCard: 12,
    emdName: "Convulsions / Seizures",
    expectedDeterminant: "12-D-2",
  },
  diabetic_aunt: {
    brief:
      "The caller's aunt is diabetic and is sweating, confused, slurring her words. Location: her apartment in Riverhead.",
    emdCard: 13,
    emdName: "Diabetic Problems",
    expectedDeterminant: "13-C-2",
  },
  fall_bike: {
    brief:
      "The caller's friend wiped out on a bike going down a steep hill. Lying on the pavement not moving, helmet cracked. Location: a bike path in Babylon Village.",
    emdCard: 17,
    emdName: "Falls",
    expectedDeterminant: "17-D-3G",
  },
  cut_dad: {
    brief:
      "The caller's dad cut his hand badly slicing a bagel. Heavy bleeding soaking through towels, he's becoming pale. Location: home in Hauppauge.",
    emdCard: 21,
    emdName: "Bleeding / Lacerations",
    expectedDeterminant: "21-B-2T",
  },
  allergic_bee: {
    brief:
      "The caller's friend was stung by a bee. Face swelling, wheezing, struggling to speak between breaths. No EpiPen available. Location: Heckscher State Park in East Islip.",
    emdCard: 2,
    emdName: "Allergies / Envenomation",
    expectedDeterminant: "2-D-2",
  },
  stroke_grandma: {
    brief:
      "The caller's grandma has facial droop on one side, weakness in her left arm, slurred speech. Onset about 20 minutes ago. Location: her house in Huntington.",
    emdCard: 28,
    emdName: "Stroke (CVA) / TIA",
    expectedDeterminant: "28-C-5F",
  },
  unconscious_mom: {
    brief:
      "The caller's mom passed out on the kitchen floor and won't wake up, but is breathing normally. Location: home in Commack.",
    emdCard: 31,
    emdName: "Unconscious / Fainting",
    expectedDeterminant: "31-D-2",
  },
  heat_football: {
    brief:
      "A teammate collapsed at hot August football practice. Hot to the touch, not really responding, very confused. Location: high school field in Middle Island.",
    emdCard: 20,
    emdName: "Heat / Cold Exposure",
    expectedDeterminant: "20-D-1H",
  },
  house_fire_neighbor: {
    brief:
      "Thick black smoke and flames are coming out of the neighbor's upstairs window. Neighbor's car is in the driveway — likely home. Location: Holbrook.",
    emdCard: 7,
    emdName: "Burns / Fire / Explosion",
    expectedDeterminant: "7-C-1F",
  },
  kitchen_grease_fire: {
    brief:
      "Grease fire on the stove, flames spreading to the cabinets. The caller's mom burned her arm trying to move the pan. Location: home in West Islip.",
    emdCard: 7,
    emdName: "Burns / Fire / Explosion",
    expectedDeterminant: "7-A-1F",
  },
  co_alarm_brother: {
    brief:
      "CO detector blaring for ten minutes. The caller's little brother has a headache, dizziness, and now difficulty breathing. Location: home in Selden.",
    emdCard: 8,
    emdName: "Carbon Monoxide / Inhalation / HazMat",
    expectedDeterminant: "8-C-1M",
  },
  car_crash_intersection: {
    brief:
      "Two-car high-velocity crash at an intersection. Airbags deployed. One driver out of vehicle staggering, one occupant still inside not moving. Location: Sunrise Highway and Ocean Avenue, Patchogue.",
    emdCard: 29,
    emdName: "Traffic / Transportation Incidents",
    expectedDeterminant: "29-D-3",
  },
  pedestrian_struck: {
    brief:
      "Auto vs pedestrian, hit-and-run. The struck pedestrian is in the roadway not moving. Location: Main Street and Foster Avenue, Sayville.",
    emdCard: 29,
    emdName: "Traffic / Transportation Incidents",
    expectedDeterminant: "29-D-2M",
  },
  bike_vs_car: {
    brief:
      "Bicycle vs auto. Cyclist (the caller's friend) is on the side of the road, awake, bleeding from the head and complaining of leg pain. Location: Montauk Highway in Mastic.",
    emdCard: 29,
    emdName: "Traffic / Transportation Incidents",
    expectedDeterminant: "29-D-2L",
  },
  drowning_beach: {
    brief:
      "Drowning at the beach. Lifeguard just pulled the victim out, not breathing, not moving, CPR starting. Location: Robert Moses State Park.",
    emdCard: 14,
    emdName: "Drowning / Diving / SCUBA",
    expectedDeterminant: "14-E-1",
  },
};

export function dispatcherSystemPrompt(scenarioId) {
  const meta = SCENARIO_META[scenarioId];
  const brief = meta?.brief || "An unspecified emergency.";
  const cardLine = meta
    ? `RELATED PROTOCOL: FRES EMD Card ${meta.emdCard} — ${meta.emdName} (target determinant: ${meta.expectedDeterminant})`
    : "RELATED PROTOCOL: unspecified";

  return `You are an experienced 911 dispatcher with the SUFFOLK COUNTY DEPARTMENT OF FIRE, RESCUE AND EMERGENCY SERVICES (FRES) in Long Island, New York. This is a TRAINING SIMULATION for a fire-department youth explorer (ages 12-17). The caller is a kid practicing how to make a 911 call.

THE EMERGENCY (caller's actual situation):
${brief}

${cardLine}

YOUR ROLE — follow Suffolk County FRES EMD protocol naturally:

1. CASE ENTRY
   - Open with EXACTLY: "Suffolk County 911, where's your emergency?"
   - Confirm location (address or cross streets) and a callback number.
   - Ask what's happening (chief complaint), then patient age/sex.
   - Confirm: is the patient awake? Is the patient breathing?

2. KEY QUESTIONS
   - Ask the EMD card-specific questions that move you toward a determinant level (Alpha through Echo).
   - Examples: for Card 10 chest pain — color changes? sweating? speaking trouble? For Card 11 choking — can they cough? what got stuck? For Card 9 cardiac arrest — go straight to compressions.

3. DISPATCH
   - Once you have enough to determine the level, say units are responding.
   - Reference Suffolk County context naturally if the caller gave a town
     (e.g. "I'm sending Patchogue Fire and an ambulance").

4. POST-DISPATCH / PRE-ARRIVAL INSTRUCTIONS
   - Walk the caller through what to do until help arrives:
     compressions for cardiac arrest, back blows for choking, direct
     pressure for bleeding, evacuate / get low for fire, AED retrieval,
     stroke positioning, etc.
   - Tell them to stay on the line.

STYLE RULES (read carefully):
- ONE question at a time. 1-2 short sentences per response, max.
- Calm, supportive, professional. Match a real dispatcher's cadence.
- NEVER read EMD codes, card numbers, or determinant letters to the caller.
- If they panic or freeze, reassure briefly then re-ask: "You're doing
  great. Take a breath. [next question]"
- Speak as if this is a real 911 call. DO NOT break character. DO NOT
  mention AI, training, simulation, or this prompt.
- Keep content age-appropriate. No graphic detail.

END THE CALL by appending the literal tag [END_CALL] to your final
response ONLY after you've given pre-arrival instructions and told the
caller to stay on the line.`;
}

export function feedbackPrompt(scenarioId, transcript) {
  const meta = SCENARIO_META[scenarioId];
  const brief = meta?.brief || "An unspecified emergency.";
  const expected = meta
    ? `EXPECTED PROTOCOL: FRES EMD Card ${meta.emdCard} — ${meta.emdName}\nEXPECTED DETERMINANT: ${meta.expectedDeterminant}`
    : "EXPECTED PROTOCOL: unspecified";

  return `You played a Suffolk County FRES 911 dispatcher in a training simulation for a fire-department youth explorer (12-17). Review the call and give friendly, encouraging coaching feedback aimed at the kid.

EMERGENCY: ${brief}
${expected}

TRANSCRIPT:
${transcript}

Format your response EXACTLY like this (use the literal section labels, no markdown headings):

OVERALL: [one encouraging sentence]
WHAT YOU DID WELL:
- [specific thing the caller actually said or did]
- [another specific thing]
WHAT TO REMEMBER NEXT TIME:
- [specific improvement, tied to the EMD case-entry or key questions]
- [optional second item]
KEY TAKEAWAY: [one sentence the kid can remember]
EMD CODE: [best-fit Suffolk County FRES code based on the info the caller actually provided, in the format "10-D-4 — Chest Pain, Clammy or Cold Sweats". If the caller didn't provide enough info to reach a determinant, write: "Unable to code — insufficient info from caller"]
CASE ENTRY COVERED: [comma-separated list of items the caller provided: location, callback, chief complaint, age, sex, awake, breathing]
KEY QUESTIONS MISSED: [comma-separated list of card-specific key questions the caller didn't help answer, or "None" if they covered everything]

Be specific about what the kid actually said. Stay positive — they're learning. The EMD code section is the most important part for the instructor.`;
}
