import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { analysisSchema } from "../src/lib/domain";
import { foods } from "../src/data/foods";
import { foodImage } from "../src/lib/food-images";
import catalog from "../src/data/food-images.json";

const question = {
  id: "egg",
  item_index: 0,
  kind: "egg_type",
  text: "Telur biasa atau omega?",
  options: [
    { id: "regular", label: "Biasa" },
    { id: "omega", label: "Omega" },
  ],
};
test("legacy analysis needs no confirmation; optional questions point to real foods", () => {
  assert.deepEqual(analysisSchema.parse({ items: [foods[0]] }).questions, []);
  const valid = { items: [foods[0]], questions: [question] };
  assert.equal(analysisSchema.parse(valid).questions.length, 1);
  for (const questions of [
    [{ ...question, item_index: 1 }],
    [question, question],
    [{ ...question, options: [question.options[0], question.options[0]] }],
  ]) {
    assert.equal(
      analysisSchema.safeParse({ ...valid, questions }).success,
      false,
    );
  }
});
test("illustrations cover the requested foods, unknown dishes use a neutral fallback", () => {
  for (const name of [
    "Telur rebus berbumbu",
    "Telor omega",
    "Rendang daging sapi",
    "Nasi putih",
    "Tahu goreng",
  ]) {
    const uri = foodImage(name);
    assert.ok(uri && existsSync("public" + uri), name);
  }
  assert.equal(foodImage("Menu yang belum dikenal"), undefined);
  for (const image of Object.values(catalog.images)) {
    assert.ok(existsSync("public" + image.uri));
    assert.ok(image.remote.startsWith("https://www.themealdb.com/images/"));
  }
});
