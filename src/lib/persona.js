const LAST_NAMES = [
  "Martinez", "Rodriguez", "Chen", "O'Brien", "Williams",
  "Patel", "Johnson", "Nguyen", "Romano", "Foster",
  "Garcia", "Lee", "Kowalski", "Davis", "Reyes",
  "Hernandez", "Sullivan", "Park", "Mitchell", "Singh",
];

export function generateDispatcherPersona() {
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const badge = 4000 + Math.floor(Math.random() * 1000);
  return {
    lastName,
    badge,
    label: `Dispatcher ${lastName}`,
  };
}
