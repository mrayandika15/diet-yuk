import { z } from "zod";
export const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof mealTypes)[number];
export const mealLabels: Record<MealType, string> = {
  breakfast: "Sarapan",
  lunch: "Makan siang",
  dinner: "Makan malam",
  snack: "Camilan",
};
export type Profile = {
  name: string;
  bio?: string;
  requiresClinicalPlan?: boolean;
  caloriePlan?: import("./calorie-plan").CaloriePlan;
  sex: "male" | "female";
  birthDate: string;
  height: number;
  weight: number;
  targetWeight: number;
  activity: number;
  calorieTarget: number;
  weddingDate: string;
};
export const defaultProfile: Profile = {
  name: "",
  sex: "male",
  birthDate: "1998-01-01",
  height: 170,
  weight: 70,
  targetWeight: 65,
  activity: 1.375,
  calorieTarget: 1900,
  weddingDate: "2027-09-26",
};
export const foodSchema = z.object({
  name: z.string().trim().min(1).max(150),
  tkpi_match: z.string().nullable().optional(),
  portion_g: z.number().positive().max(10000),
  calories: z.number().nonnegative().max(20000),
  protein_g: z.number().nonnegative().max(3000),
  carbs_g: z.number().nonnegative().max(3000),
  fat_g: z.number().nonnegative().max(3000),
  confidence: z.number().min(0).max(1).optional(),
  image_url: z
    .string()
    .max(700)
    .refine((value) => {
      if (/^\/food-images\/[a-z0-9_-]+\.(png|jpg)$/.test(value)) return true;
      try {
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          url.hostname === "www.themealdb.com" &&
          /^\/images\/(ingredients|media\/meals)\//.test(url.pathname)
        );
      } catch {
        return false;
      }
    }, "Sumber gambar tidak valid")
    .optional(),
  image_source: z.literal("TheMealDB").optional(),
});
export const foodQuestionSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
    item_index: z.number().int().nonnegative().max(29),
    kind: z.enum(["egg_type", "preparation", "ingredients"]),
    text: z.string().trim().min(1).max(240),
    options: z
      .array(
        z.object({
          id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
          label: z.string().trim().min(1).max(80),
        }),
      )
      .min(2)
      .max(4),
  })
  .refine(
    (q) => new Set(q.options.map((o) => o.id)).size === q.options.length,
    "Pilihan harus unik",
  );
export type FoodQuestion = z.infer<typeof foodQuestionSchema>;
export const analysisSchema = z
  .object({
    items: z.array(foodSchema).max(30),
    notes: z.string().max(6000).default(""),
    questions: z.array(foodQuestionSchema).max(3).default([]),
  })
  .refine(
    (a) =>
      a.questions.every((q) => q.item_index < a.items.length) &&
      new Set(a.questions.map((q) => q.id)).size === a.questions.length,
    "Pertanyaan belum sesuai makanan",
  );
export type Food = z.infer<typeof foodSchema> & {
  source?: "ai" | "manual" | "reference" | "tkpi";
};
export type Meal = {
  id: string;
  date: string;
  type: MealType;
  items: Food[];
  photo?: string;
  photoPath?: string;
  note: string;
  createdAt: string;
};
export type WeightLog = { date: string; weight: number };
export type Totals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};
export function total(items: Food[]): Totals {
  return items.reduce(
    (a, i) => ({
      calories: a.calories + i.calories,
      protein_g: a.protein_g + i.protein_g,
      carbs_g: a.carbs_g + i.carbs_g,
      fat_g: a.fat_g + i.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}
export function dayKey(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
export function daysAgo(n: number): string {
  const d = new Date(dayKey() + "T12:00:00+07:00");
  d.setUTCDate(d.getUTCDate() - n);
  return dayKey(d);
}
export function countdown(date: string): number {
  return Math.max(
    0,
    Math.round(
      (Date.parse(date + "T00:00:00Z") - Date.parse(dayKey() + "T00:00:00Z")) /
        86400000,
    ),
  );
}
export function calculateTarget(p: Profile, now = new Date()): number {
  const birth = new Date(p.birthDate + "T00:00:00Z");
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() &&
      now.getUTCDate() < birth.getUTCDate())
  )
    age--;
  const bmr =
    10 * p.weight + 6.25 * p.height - 5 * age + (p.sex === "male" ? 5 : -161);
  const deficit =
    p.targetWeight < p.weight ? 350 : p.targetWeight > p.weight ? -250 : 0;
  return Math.round(
    Math.max(p.sex === "male" ? 1500 : 1200, bmr * p.activity - deficit),
  );
}
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function validateProfile(p: Profile): string | undefined {
  if (!p.name.trim()) return "Isi nama panggilanmu dulu.";
  if (
    typeof p.bio !== "undefined" &&
    (typeof p.bio !== "string" || p.bio.length > 300)
  )
    return "Bio maksimal 300 karakter.";
  if (!validDate(p.birthDate) || p.birthDate > daysAgo(365 * 18))
    return "Masukkan tanggal lahir yang valid. App ini untuk usia 18+.";
  if (!validDate(p.weddingDate)) return "Tanggal pernikahan harus YYYY-MM-DD.";
  if (!Number.isFinite(p.height) || p.height < 100 || p.height > 250)
    return "Tinggi badan harus 100–250 cm.";
  if (
    !Number.isFinite(p.weight) ||
    p.weight < 30 ||
    p.weight > 350 ||
    !Number.isFinite(p.targetWeight) ||
    p.targetWeight < 30 ||
    p.targetWeight > 350
  )
    return "Berat badan harus 30–350 kg.";
  if (
    !Number.isFinite(p.calorieTarget) ||
    p.calorieTarget < 1000 ||
    p.calorieTarget > 6000
  )
    return "Target kalori harus 1.000–6.000 kkal.";
}
export function resizeFood(food: Food, grams: number): Food {
  const ratio = grams / food.portion_g;
  return {
    ...food,
    portion_g: grams,
    calories: food.calories * ratio,
    protein_g: food.protein_g * ratio,
    carbs_g: food.carbs_g * ratio,
    fat_g: food.fat_g * ratio,
  };
}
export function streak(meals: Meal[]): number {
  const counts = new Map<string, number>();
  for (const m of meals) counts.set(m.date, (counts.get(m.date) || 0) + 1);
  let offset = (counts.get(dayKey()) || 0) >= 2 ? 0 : 1;
  let count = 0;
  while ((counts.get(daysAgo(offset)) || 0) >= 2) {
    count++;
    offset++;
  }
  return count;
}
export function badges(meals: Meal[], weights: WeightLog[], p: Profile) {
  const s = streak(meals);
  const latest =
    [...weights].sort((a, b) => b.date.localeCompare(a.date))[0]?.weight ??
    p.weight;
  const totals = new Map<string, number>();
  meals.forEach((m) =>
    totals.set(m.date, (totals.get(m.date) || 0) + total(m.items).calories),
  );
  const onTarget = [...totals.values()].filter(
    (n) => n >= p.calorieTarget * 0.8 && n <= p.calorieTarget * 1.05,
  ).length;
  return [
    {
      code: "first_meal",
      icon: "🌱",
      name: "Langkah pertama",
      earned: meals.length > 0,
    },
    { code: "streak_3", icon: "🔥", name: "3 hari konsisten", earned: s >= 3 },
    { code: "streak_7", icon: "✨", name: "7 hari konsisten", earned: s >= 7 },
    {
      code: "streak_30",
      icon: "🏆",
      name: "30 hari konsisten",
      earned: s >= 30,
    },
    {
      code: "on_target_7",
      icon: "🎯",
      name: "7 hari seimbang",
      earned: onTarget >= 7,
    },
    {
      code: "weight_minus_1",
      icon: "🌷",
      name: "Turun 1 kg",
      earned: p.weight - latest >= 1,
    },
    {
      code: "weight_minus_3",
      icon: "💪",
      name: "Turun 3 kg",
      earned: p.weight - latest >= 3,
    },
    {
      code: "goal_reached",
      icon: "💖",
      name: "Sampai tujuan",
      earned:
        weights.length > 0 &&
        (p.targetWeight < p.weight
          ? latest <= p.targetWeight
          : p.targetWeight > p.weight
            ? latest >= p.targetWeight
            : Math.abs(latest - p.targetWeight) < 0.5),
    },
  ];
}
export function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}
