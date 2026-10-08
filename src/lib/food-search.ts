import { z } from "zod";

export type MenuResult = {
  id: string;
  kind: "meal" | "ingredient";
  name: string;
  imageUrl: string;
  subtitle: string;
};
export const preparationLabels = {
  as_listed: "Sesuai menu",
  boiled: "Rebus",
  fried: "Goreng",
  grilled: "Panggang",
  steamed: "Kukus",
  raw: "Mentah / segar",
} as const;
export type Preparation = keyof typeof preparationLabels;
const API = "https://www.themealdb.com/api/json/v1/1/";
// Language aliases only. Foods and images must exist in the live API response.
const translations: Record<string, string> = {
  Eggs: "Telur",
  Egg: "Telur",
  Rice: "Nasi / beras",
  Chicken: "Ayam",
  Beef: "Daging sapi",
  Tofu: "Tahu",
  Tempeh: "Tempe",
  Spinach: "Bayam",
  Potatoes: "Kentang",
  "Sweet Potatoes": "Ubi",
  Oats: "Oatmeal",
  Bread: "Roti",
  Banana: "Pisang",
  Apples: "Apel",
  Papaya: "Pepaya",
  Orange: "Jeruk",
  Avocado: "Alpukat",
  Watermelon: "Semangka",
  Milk: "Susu",
  Yogurt: "Yogurt",
  Chilli: "Cabai / sambal",
  "Fish fillet": "Ikan",
  Noodles: "Mie",
  Broccoli: "Brokoli",
  Cucumber: "Mentimun",
  Peanuts: "Kacang tanah",
  Shrimp: "Udang",
  Carrots: "Wortel",
  Cassava: "Singkong",
  Water: "Air putih",
  Sugar: "Gula",
  "Soya Milk": "Susu kedelai",
  Salmon: "Salmon",
  "Chicken Breast": "Dada ayam",
  "Egg White": "Putih telur",
  "Egg Yolks": "Kuning telur",
  "Coconut Milk": "Santan",
  Butter: "Mentega",
  Cheese: "Keju",
  "Green Beans": "Buncis",
  "Soy Sauce": "Kecap",
};
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/telor/g, "telur")
    .replace(/broccoli/g, "brokoli")
    .trim();
const apiIngredientSchema = z.object({
  strIngredient: z.string().min(1).max(100),
});
const apiMealSchema = z.object({
  idMeal: z.string().regex(/^\d{1,8}$/),
  strMeal: z.string().min(1).max(150),
  strMealThumb: z.string().max(700).refine(isMealImage),
});
export function isMealImage(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      u.hostname === "www.themealdb.com" &&
      u.pathname.startsWith("/images/media/meals/")
    );
  } catch {
    return false;
  }
}
export function parseMenuResults(data: unknown): MenuResult[] {
  const raw =
    z.object({ meals: z.array(z.unknown()).nullable() }).parse(data).meals ??
    [];
  return raw.flatMap((row) => {
    const result = apiMealSchema.safeParse(row);
    return result.success
      ? [
          {
            id: result.data.idMeal,
            kind: "meal" as const,
            name: result.data.strMeal,
            imageUrl: result.data.strMealThumb,
            subtitle: "Menu · nutrisi dihitung setelah dipilih",
          },
        ]
      : [];
  });
}
async function api(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(API + path, { signal });
  if (!response.ok)
    throw Error("Pencarian menu sedang tidak tersedia. Coba lagi.");
  return response.json();
}
let ingredientCache: string[] | undefined;
export function ingredientMatches(
  names: string[],
  query: string,
): MenuResult[] {
  const needle = normalize(query);
  const seen = new Set<string>();
  const popular = ["Eggs", "Rice", "Chicken", "Tofu", "Tempeh", "Banana"];
  return names
    .slice()
    .sort((a, b) => {
      const rank = (s: string) =>
        popular.includes(s) ? popular.indexOf(s) : 100;
      return rank(a) - rank(b);
    })
    .flatMap((name) => {
      const label = translations[name] ?? name;
      const aliases = normalize(label)
        .split(/\s*\/\s*|\s+/)
        .filter((a) => a.length >= 3);
      const includes = (text: string) =>
        needle.length <= 3
          ? normalize(text)
              .split(/\s+|\//)
              .some((word) => word.startsWith(needle))
          : normalize(text).includes(needle);
      const matched = !needle
        ? popular.includes(name)
        : includes(name) ||
          includes(label) ||
          aliases.some((a) => needle.includes(a));
      if (!matched || seen.has(normalize(label))) return [];
      seen.add(normalize(label));
      return [
        {
          id: name,
          kind: "ingredient" as const,
          name: label,
          imageUrl: `https://www.themealdb.com/images/ingredients/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, "_"))}-small.png`,
          subtitle: "Bahan · pilih cara masak & porsi",
        },
      ];
    })
    .slice(0, 6);
}
export async function searchMenus(query: string, signal: AbortSignal) {
  // Each search calls a search/filter API; only the ingredient directory is cached.
  const pendingDirectory = ingredientCache
    ? Promise.resolve(ingredientCache)
    : api("list.php?i=list", signal).then((data) => {
        const raw = z.object({ meals: z.array(z.unknown()) }).parse(data);
        ingredientCache = raw.meals.flatMap((row) => {
          const parsed = apiIngredientSchema.safeParse(row);
          return parsed.success ? [parsed.data.strIngredient] : [];
        });
        return ingredientCache;
      });
  const direct = api(
    query.trim()
      ? "search.php?s=" + encodeURIComponent(query.trim())
      : "filter.php?a=Indonesian",
    signal,
  );
  const [directory, search] = await Promise.allSettled([
    pendingDirectory,
    direct,
  ]);
  signal.throwIfAborted();
  const ingredients =
    directory.status === "fulfilled"
      ? ingredientMatches(directory.value, query)
      : [];
  let meals =
    search.status === "fulfilled" ? parseMenuResults(search.value) : [];
  // Indonesian terms resolve to the ingredient filter API when name search is empty.
  const needle = normalize(query);
  const translatedQuery = ingredients.some(
    (i) =>
      i.name !== i.id &&
      normalize(i.name)
        .split(/\s+|\//)
        .some(
          (word) =>
            word.length >= 3 &&
            (word.startsWith(needle) || needle.includes(word)),
        ),
  );
  let filterFailed = false;
  if (
    query.trim() &&
    ingredients.length &&
    (!meals.length || translatedQuery)
  ) {
    try {
      meals = parseMenuResults(
        await api(
          "filter.php?i=" +
            encodeURIComponent(ingredients[0].id.replace(/\s+/g, "_")),
          signal,
        ),
      );
      const ingredient = ingredients[0].id.replace(/s$/, "").toLowerCase();
      meals.sort(
        (a, b) =>
          Number(b.name.toLowerCase().includes(ingredient)) -
          Number(a.name.toLowerCase().includes(ingredient)),
      );
    } catch (error) {
      if (signal.aborted) throw error;
      filterFailed = true;
    }
  }
  if (search.status === "rejected" && !ingredients.length)
    throw Error("Tidak dapat mencari menu. Periksa koneksi lalu coba lagi.");
  return {
    items: [...ingredients, ...meals.slice(0, 14)],
    partial:
      filterFailed ||
      directory.status === "rejected" ||
      search.status === "rejected",
  };
}
