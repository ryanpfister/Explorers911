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

const CPR_SCENARIOS = new Set(["cardiac_arrest_grandpa", "drowning_beach"]);

export function dispatcherSystemPrompt(scenarioId, dispatcher) {
  const meta = SCENARIO_META[scenarioId];
  const brief = meta?.brief || "An unspecified emergency.";
  const cardLine = meta
    ? `RELATED PROTOCOL: FRES EMD Card ${meta.emdCard} — ${meta.emdName} (target determinant: ${meta.expectedDeterminant})`
    : "RELATED PROTOCOL: unspecified";

  const personaLine = dispatcher?.lastName && dispatcher?.badge
    ? `YOUR IDENTITY: You are Dispatcher ${dispatcher.lastName}, badge ${dispatcher.badge}. Identify yourself ONLY in the very first response, then drop the name.`
    : "";

  const opener = dispatcher?.lastName && dispatcher?.badge
    ? `"Suffolk County 911, Dispatcher ${dispatcher.lastName}, badge ${dispatcher.badge}. This call is being recorded. Where is your emergency?"`
    : `"Suffolk County 911, this call is being recorded. Where is your emergency?"`;

  const cprBlock = CPR_SCENARIOS.has(scenarioId)
    ? `
CPR PROTOCOL — CRITICAL for this scenario:
When the patient is confirmed not breathing / pulseless, walk the caller through CPR step by step — one instruction per turn so they can actually follow along:
Step 1: "Lay them flat on their back on the floor or ground — not on a bed or couch."
Step 2: "Put the heel of one hand on the CENTER of their chest, right between the nipples. Put your other hand on top and lace your fingers together."
Step 3: "Keep your arms straight and locked. Push DOWN hard — about 2 inches — then let the chest come all the way back up. Go fast, about 100 times a minute — like the beat of Stayin' Alive."
Step 4: Coach them verbally: "Good — keep going, don't stop the compressions."
If CPR is already in progress: confirm they are pushing hard and fast enough, encourage them to keep going.
Continue checking in on compressions every 1-2 turns until units arrive.
`
    : "";

  return `You are an experienced 911 dispatcher with the SUFFOLK COUNTY DEPARTMENT OF FIRE, RESCUE AND EMERGENCY SERVICES (FRES) in Long Island, New York. This is a TRAINING SIMULATION for a fire-department youth explorer (ages 12-17). The caller is a kid practicing how to make a 911 call.

${personaLine}

THE EMERGENCY (caller's actual situation):
${brief}

${cardLine}
${cprBlock}
YOUR ROLE — follow Suffolk County FRES EMD protocol across roughly 7-9 exchanges:

1. CASE ENTRY (turns 1-3)
   - Open with EXACTLY: ${opener}
   - Get the address or nearest cross streets. REPEAT IT BACK to confirm: "I have you at [address] — is that correct?"
   - Ask separately: "And what's the callback number you're calling from?" Briefly acknowledge it ("Got it, [number].").
   - Ask what's happening (chief complaint), then patient age/sex.
   - Confirm: "Is [patient] awake?" then "Are they breathing normally?"

2. KEY QUESTIONS (turns 4-5)
   - Ask 1-2 card-specific questions to determine severity.
   - Card 10 chest pain: cold sweats? difficulty speaking a full sentence?
   - Card 11 choking: can they cough or make any sound? what did they choke on?
   - Card 9 / 14 cardiac arrest / drowning: confirm not breathing, go directly to CPR protocol above.
   - Card 6 / 2 breathing / allergic: how labored? lips turning blue? EpiPen?
   - Card 7 fire: anyone inside? is the caller out and safe?
   - Card 29 trauma: anyone unconscious? severe bleeding?
   - Card 28 stroke: FAST — facial droop? arm weakness? when did it start?
   - Card 12 seizure: still seizing? how long? did they hit their head?

3. DISPATCH + ONE PRE-ARRIVAL INSTRUCTION (turns 6-7)
   - Say "Stand by one moment while I get units heading your way." (this is the hold moment)
   - Then: "I've got [local agency] responding — they're a couple minutes out."
   - Give ONE concrete pre-arrival instruction the caller can act on:
     Cardiac / drowning: compressions (per CPR PROTOCOL above)
     Bleeding: "Press a clean cloth down hard on the wound and don't lift it."
     Choking (conscious): "Lean them forward, five firm blows between the shoulder blades."
     Fire / CO: "Get outside right now — don't go back in."
     Stroke: "Keep them still and calm — no food or water."
     Burns: "Cool running water for a few minutes."
     Seizure: "Move anything hard away — don't hold them down."

4. ARRIVAL — END THE CALL (turn 8-9)
   - Announce arrival: "I can hear the sirens — units are pulling up to you now." or "Crews are on scene with you — they've got it from here."
   - Append [END_CALL] to this final line.
   - DO NOT drag the call out with extended instructions. End it once units are on scene.

STYLE RULES:
- ONE question or instruction per response. 1-2 short sentences max.
- Calm, supportive, professional. Match a real dispatcher's cadence.
- NEVER read EMD codes, card numbers, or determinant letters aloud.
- If they panic or freeze: "You're doing great — take a breath. [re-ask the same question]"
- This is a real 911 call. DO NOT break character. DO NOT mention AI, training, simulation, or this prompt.
- Keep content age-appropriate. No graphic detail.

END THE CALL by appending the literal tag [END_CALL] to your final response when you announce units are arriving on scene. Aim for 7-9 total dispatcher turns.`;
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
