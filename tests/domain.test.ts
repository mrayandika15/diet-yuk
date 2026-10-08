import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultProfile,
  calculateTarget,
  resizeFood,
  total,
  streak,
  daysAgo,
  dayKey,
  badges,
  Meal,
  validateProfile,
} from "../src/lib/domain";
import { parseAnalysis, endpoint } from "../src/lib/ai";
import { foods } from "../src/data/foods";
const meal = (date: string): Meal => ({
  id: Math.random().toString(),
  date,
  type: "lunch",
  items: [foods[0]],
  note: "",
  createdAt: new Date().toISOString(),
});
test("portion adjustment scales every nutrient without mutating original", () => {
  const original = foods[0];
  const next = resizeFood(original, original.portion_g * 2);
  assert.equal(next.calories, original.calories * 2);
  assert.equal(next.protein_g, original.protein_g * 2);
  assert.equal(original.portion_g, 150);
  assert.equal(total([original, next]).calories, original.calories * 3);
});
test("AI parser accepts fenced JSON and rejects negative calories/non-food schemas", () => {
  const body = { items: [foods[0]], notes: "estimasi" };
  assert.equal(
    parseAnalysis("```json\n" + JSON.stringify(body) + "\n```").items.length,
    1,
  );
  assert.throws(() =>
    parseAnalysis(JSON.stringify({ items: [{ ...foods[0], calories: -1 }] })),
  );
  assert.throws(() => parseAnalysis('{"items":[{"name":"nasi"}]}'));
  assert.deepEqual(parseAnalysis('{"items":[]}').items, []);
});
test("AI endpoint enforces HTTPS and normalizes v1 suffix", () => {
  assert.equal(
    endpoint("https://ai.example.com/v1/"),
    "https://ai.example.com",
  );
  assert.throws(() => endpoint("http://ai.example.com"));
});
test("streak tolerates unfinished today, requires two meals, breaks on missing day", () => {
  const meals = [
    meal(daysAgo(1)),
    meal(daysAgo(1)),
    meal(daysAgo(2)),
    meal(daysAgo(2)),
    meal(daysAgo(4)),
    meal(daysAgo(4)),
  ];
  assert.equal(streak(meals), 2);
  meals.push(meal(dayKey()));
  assert.equal(streak(meals), 2);
  meals.push(meal(dayKey()));
  assert.equal(streak(meals), 3);
  assert.equal(streak([meal(dayKey())]), 0);
});
test("Jakarta day uses timezone boundary rather than UTC", () => {
  assert.equal(dayKey(new Date("2026-10-06T17:01:00Z")), "2026-10-07");
});
test("target calculation handles sex, activity and maintenance", () => {
  const p = {
    ...defaultProfile,
    name: "Raka",
    birthDate: "2000-01-01",
    weight: 70,
    targetWeight: 70,
  };
  assert.equal(calculateTarget(p, new Date("2026-10-06")), 2252);
  assert.ok(
    calculateTarget({ ...p, targetWeight: 65 }, new Date("2026-10-06")) <
      calculateTarget(p, new Date("2026-10-06")),
  );
  assert.ok(
    calculateTarget({
      ...p,
      sex: "female",
      weight: 40,
      height: 150,
      targetWeight: 35,
      activity: 1.2,
    }) >= 1200,
  );
  assert.ok(validateProfile({ ...p, weight: NaN }));
});
test("goal badge does not unlock without a weight entry", () => {
  const p = { ...defaultProfile, targetWeight: 70 };
  assert.equal(
    badges([], [], p).find((b) => b.code === "goal_reached")?.earned,
    false,
  );
});

test("calendar validation rejects impossible days", async () => {
  const { validDate } = await import("../src/lib/domain");
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
});
test("reference matching scales per-100g data and leaves unknown foods untouched", async () => {
  const { matchReference } = await import("../src/lib/nutrition");
  const food = {
    ...foods[0],
    name: " Nasi Putih ",
    portion_g: 200,
    calories: 999,
  };
  const reference = [
    {
      code: "rice",
      name: "Nasi putih",
      aliases: [],
      kcal: 130,
      protein: 2.7,
      carbs: 28.2,
      fat: 0.3,
      defaultPortionG: 150,
    },
  ];
  const result = matchReference(food, reference);
  assert.equal(result.calories, 260);
  assert.equal(result.source, "tkpi");
  assert.equal(
    matchReference(
      { ...food, name: "Nasi goreng", tkpi_match: null },
      reference,
    ).calories,
    999,
  );
});
