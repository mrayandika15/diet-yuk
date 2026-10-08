// Official TheMealDB API artwork, cached locally so review also works offline.
// Run from the repo root: node scripts/sync-food-images.mjs
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
const run = promisify(execFile);
const dir = "public/food-images";
await mkdir(dir, { recursive: true });
const { stdout } = await run("curl", [
  "-fsSL",
  "--retry",
  "2",
  "--max-time",
  "25",
  "https://www.themealdb.com/api/json/v1/1/list.php?i=list",
]);
const available = new Set(
  JSON.parse(stdout).meals.map((i) =>
    i.strIngredient.toLowerCase().replaceAll(" ", "_"),
  ),
);
const ingredients = [
  "eggs",
  "rice",
  "chicken",
  "beef",
  "tofu",
  "tempeh",
  "spinach",
  "potatoes",
  "sweet_potatoes",
  "oats",
  "bread",
  "banana",
  "apples",
  "papaya",
  "orange",
  "avocado",
  "watermelon",
  "milk",
  "yogurt",
  "chilli",
  "fish_fillet",
  "noodles",
  "broccoli",
  "cucumber",
  "peanuts",
  "shrimp",
  "carrots",
  "cassava",
  "water",
  "sugar",
  "coffee",
  "tea",
  "soya_milk",
];
const images = {};
for (let index = 0; index < ingredients.length; index += 3) {
  await Promise.all(
    ingredients.slice(index, index + 3).map(async (id) => {
      if (!available.has(id)) return;
      const remote = `https://www.themealdb.com/images/ingredients/${id}-small.png`;
      await run("curl", [
        "-fsSL",
        "--retry",
        "2",
        "--max-time",
        "25",
        remote,
        "-o",
        `${dir}/${id}.png`,
      ]);
      images[id] = { uri: `/food-images/${id}.png`, remote };
    }),
  );
}
const meal = JSON.parse(
  (
    await run("curl", [
      "-fsSL",
      "--retry",
      "2",
      "--max-time",
      "25",
      "https://www.themealdb.com/api/json/v1/1/search.php?s=rendang",
    ])
  ).stdout,
).meals?.find((m) => m.strMeal === "Beef Rendang");
if (
  meal &&
  /^https:\/\/www\.themealdb\.com\/images\/media\/meals\//.test(
    meal.strMealThumb,
  )
) {
  const remote = meal.strMealThumb + "/small";
  await run("curl", [
    "-fsSL",
    "--retry",
    "2",
    "--max-time",
    "25",
    remote,
    "-o",
    `${dir}/rendang.jpg`,
  ]);
  images.rendang = { uri: "/food-images/rendang.jpg", remote };
}
await writeFile(
  "src/data/food-images.json",
  JSON.stringify(
    {
      provider: "TheMealDB",
      source: "https://www.themealdb.com/api.php",
      syncedOn: new Date().toISOString().slice(0, 10),
      images,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Cached ${Object.keys(images).length} official API illustrations.`);
