import dataset from "../../assets/data/tkpi.json";
import { Food } from "./domain";
export type ReferenceFood = {
  code: string;
  name: string;
  aliases: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  defaultPortionG: number;
};
export const referenceItems = dataset.items as ReferenceFood[];
const normalize = (s: string) =>
  s.toLocaleLowerCase("id-ID").trim().replace(/\s+/g, " ");
export function fromReference(
  item: ReferenceFood,
  grams = item.defaultPortionG,
): Food {
  return {
    name: item.name,
    tkpi_match: item.name,
    portion_g: grams,
    calories: (item.kcal * grams) / 100,
    protein_g: (item.protein * grams) / 100,
    carbs_g: (item.carbs * grams) / 100,
    fat_g: (item.fat * grams) / 100,
    source: "tkpi",
  };
}
export function matchReference(
  food: Food,
  reference: ReferenceFood[] = referenceItems,
): Food {
  const names = [food.tkpi_match, food.name]
    .filter(Boolean)
    .map((n) => normalize(n!));
  const found = reference.find((item) =>
    [item.name, ...item.aliases].some((n) => names.includes(normalize(n))),
  );
  return found
    ? { ...fromReference(found, food.portion_g), confidence: food.confidence }
    : food;
}
