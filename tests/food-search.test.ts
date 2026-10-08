import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ingredientMatches,
  parseMenuResults,
  searchMenus,
} from "../src/lib/food-search";
import { foodSchema, resizeFood } from "../src/lib/domain";

test("Indonesian partial searches use actual API ingredients, not fabricated entries", () => {
  assert.deepEqual(
    ingredientMatches(
      ["Eggs", "Egg", "Chicken", "Carrots", "Nutella"],
      "tel",
    ).map((x) => x.name),
    ["Telur"],
  );
  assert.equal(ingredientMatches(["Eggs"], "telor rebus")[0].id, "Eggs");
  assert.deepEqual(ingredientMatches(["Chicken"], "tel"), []);
  assert.equal(
    ingredientMatches(["Tempeh"], "tempe")[0].imageUrl,
    "https://www.themealdb.com/images/ingredients/tempeh-small.png",
  );
});
test("only pictured meals from the official image host enter search results", () => {
  const meal = {
    idMeal: "53053",
    strMeal: "Beef Rendang",
    strMealThumb:
      "https://www.themealdb.com/images/media/meals/bc8v651619789840.jpg",
  };
  assert.equal(parseMenuResults({ meals: [meal] }).length, 1);
  for (const image of [
    "",
    "https://evil.test/photo.jpg",
    "https://www.themealdb.com.evil.test/images/media/meals/photo.jpg",
  ]) {
    assert.equal(
      parseMenuResults({ meals: [{ ...meal, strMealThumb: image }] }).length,
      0,
    );
  }
  assert.deepEqual(parseMenuResults({ meals: null }), []);
});
test("pictured food metadata survives parsing and portion scaling", () => {
  const original = foodSchema.parse({
    name: "Telur rebus",
    portion_g: 100,
    calories: 155,
    protein_g: 13,
    carbs_g: 1,
    fat_g: 11,
    image_url: "https://www.themealdb.com/images/ingredients/eggs-small.png",
    image_source: "TheMealDB",
  });
  const portion = resizeFood(original, 55);
  assert.equal(portion.calories, 85.25);
  assert.equal(portion.image_url, original.image_url);
  assert.throws(() =>
    foodSchema.parse({ ...original, image_url: "javascript:alert(1)" }),
  );
});
test("search makes live API calls, translates eggs to ingredient filtering, and supports abort", async () => {
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const body = String(url).includes("list.php")
      ? { meals: [{ strIngredient: "Eggs" }] }
      : String(url).includes("filter.php?i=")
        ? {
            meals: [
              {
                idMeal: "12345",
                strMeal: "Egg omelette",
                strMealThumb:
                  "https://www.themealdb.com/images/media/meals/omelette.jpg",
              },
            ],
          }
        : { meals: null };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  try {
    const result = await searchMenus("telur", new AbortController().signal);
    assert.ok(calls.some((c) => c.includes("search.php?s=telur")));
    assert.ok(calls.some((c) => c.includes("filter.php?i=Eggs")));
    assert.equal(result.items[0].name, "Telur");
    assert.equal(result.items[1].name, "Egg omelette");
    const abort = new AbortController();
    abort.abort();
    await assert.rejects(searchMenus("telur", abort.signal));
    globalThis.fetch = async () => {
      throw Error("offline");
    };
    await assert.rejects(
      searchMenus("unknown dish", new AbortController().signal),
      /koneksi/,
    );
    const cached = await searchMenus("telur", new AbortController().signal);
    assert.equal(cached.partial, true);
    assert.equal(cached.items[0].name, "Telur");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
