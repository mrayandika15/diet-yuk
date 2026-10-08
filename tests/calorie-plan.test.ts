import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculateCaloriePlan,
  ageOn,
  PlanInput,
} from "../src/lib/calorie-plan";
const vectors = JSON.parse(readFileSync("tests/calorie-vectors.json", "utf8"));
const sample: PlanInput = vectors[0].profile;
test("calorie plan matches shared server vectors, birthdays and applied floors", () => {
  for (const { profile, day, expected } of vectors) {
    const actual = calculateCaloriePlan(profile, day);
    for (const [field, value] of Object.entries(expected))
      assert.equal(actual[field as keyof typeof actual], value, field);
  }
  assert.equal(ageOn("2008-10-09", "2026-10-08"), 17);
  assert.equal(ageOn("2008-10-08", "2026-10-08"), 18);
});
test("calorie plan rejects incomplete, impossible or unsupported inputs", () => {
  for (const changes of [
    { birthDate: "2000-02-31" },
    { birthDate: "2008-10-09" },
    { birthDate: "1900-01-01" },
    { height: NaN },
    { weight: 0 },
    { targetWeight: 40 },
    { activity: 9 },
    { sex: "unknown" },
    { bio: "a".repeat(301) },
    { requiresClinicalPlan: true },
    { height: 250, weight: 350, targetWeight: 350, activity: 1.725 },
  ])
    assert.throws(() =>
      calculateCaloriePlan(
        { ...sample, ...changes } as PlanInput,
        "2026-10-08",
      ),
    );
});
