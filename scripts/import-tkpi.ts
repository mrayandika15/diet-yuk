import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
const item = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  kcal: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  defaultPortionG: z.number().positive().default(100),
});
const schema = z.object({
  source: z.object({
    name: z.string().min(1),
    url: z.string().url(),
    license: z.string().min(1),
  }),
  items: z.array(item).min(1),
});
const input = process.argv[2];
if (!input)
  throw Error("Usage: npm run import:tkpi -- /path/to/licensed-tkpi.json");
const result = schema.parse(JSON.parse(readFileSync(input, "utf8")));
if (new Set(result.items.map((i) => i.code)).size !== result.items.length)
  throw Error("Duplicate food codes");
writeFileSync("assets/data/tkpi.json", JSON.stringify(result, null, 2) + "\n");
console.log(
  `Imported ${result.items.length} foods with provenance. Confirm licensing before committing the dataset.`,
);
