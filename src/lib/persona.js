const FRES_NAMES = [
  "Martinez", "Rodriguez", "Chen", "O'Brien", "Williams",
  "Patel", "Johnson", "Nguyen", "Romano", "Foster",
  "Garcia", "Lee", "Kowalski", "Davis", "Reyes",
  "Hernandez", "Sullivan", "Park", "Mitchell", "Singh",
];

const PD_NAMES = [
  "Hartman", "Diaz", "Bennett", "Walsh", "Caputo",
  "Coyle", "Marino", "DeLuca", "Hoffman", "Brennan",
  "Vasquez", "Costa", "Ryan", "Morales", "Kennedy",
];

export function generateDispatcherPersona() {
  const lastName = FRES_NAMES[Math.floor(Math.random() * FRES_NAMES.length)];
  const badge = 4000 + Math.floor(Math.random() * 1000);
  return { lastName, badge, label: `Dispatcher ${lastName}` };
}

export function generatePdPersona() {
  const lastName = PD_NAMES[Math.floor(Math.random() * PD_NAMES.length)];
  const badge = 1000 + Math.floor(Math.random() * 3000);
  return { lastName, badge, label: `Officer ${lastName}` };
}
