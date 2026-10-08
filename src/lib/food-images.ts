import catalog from "../data/food-images.json";

// Illustrations only. These matches never change a food's nutritional data.
const matches: [RegExp, string][] = [
  [/rendang/i, "rendang"],
  [/tel[ou]r|\begg/i, "eggs"],
  [/tempe/i, "tempeh"],
  [/tahu|tofu/i, "tofu"],
  [/susu kedelai/i, "soya_milk"],
  [/susu|boba/i, "milk"],
  [/yog[hu]*urt/i, "yogurt"],
  [/kopi|coffee/i, "coffee"],
  [/\bteh\b|\btea\b/i, "tea"],
  [/udang|shrimp/i, "shrimp"],
  [/ikan|salmon|lele/i, "fish_fillet"],
  [/ayam|chicken/i, "chicken"],
  [/sapi|daging|bakso|beef/i, "beef"],
  [/mie|mi |noodle/i, "noodles"],
  [/nasi|beras|bubur|lontong|rice/i, "rice"],
  [/singkong|cassava/i, "cassava"],
  [/kentang|potato/i, "potatoes"],
  [/ubi/i, "sweet_potatoes"],
  [/oat/i, "oats"],
  [/roti|bread/i, "bread"],
  [/pisang|banana/i, "banana"],
  [/apel|apple/i, "apples"],
  [/pepaya|papaya/i, "papaya"],
  [/jeruk|orange/i, "orange"],
  [/alpukat|avocado/i, "avocado"],
  [/semangka|watermelon/i, "watermelon"],
  [/sambal|cabai|cabe|chilli/i, "chilli"],
  [/kacang|gado/i, "peanuts"],
  [/bro[ck]oli/i, "broccoli"],
  [/timun|cucumber/i, "cucumber"],
  [/bayam|kangkung|sayur|salad/i, "spinach"],
  [/sop|sup/i, "carrots"],
  [/air putih|water/i, "water"],
];
export function foodImage(name: string, native = false): string | undefined {
  // A cassava-root illustration would misrepresent the leafy vegetable.
  if (/daun singkong/i.test(name)) return undefined;
  const key = matches.find(
    ([pattern, id]) => pattern.test(name) && id in catalog.images,
  )?.[1];
  const image = key
    ? catalog.images[key as keyof typeof catalog.images]
    : undefined;
  return native ? image?.remote : image?.uri;
}
