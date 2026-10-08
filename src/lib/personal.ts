export const people = ["Raka", "Anggun"] as const;
export const appName = "Raka & Anggun";
export type Person = (typeof people)[number];

export function isPerson(value: unknown): value is Person {
  return people.some((person) => person === value);
}

export function companionName(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (normalized === "raka") return "Anggun";
  if (normalized === "anggun") return "Raka";
  return "pasanganmu";
}
