import { z } from "zod";
import type { Profile } from "./domain";

export const activityLevels = [
  {
    label: "Banyak duduk",
    value: 1.2,
    detail: "Sebagian besar hari duduk, jarang olahraga.",
  },
  {
    label: "Ringan",
    value: 1.375,
    detail: "Aktivitas ringan atau olahraga 1–3 hari/minggu.",
  },
  {
    label: "Sedang",
    value: 1.55,
    detail: "Banyak bergerak atau olahraga 3–5 hari/minggu.",
  },
  {
    label: "Aktif",
    value: 1.725,
    detail: "Pekerjaan fisik atau olahraga hampir setiap hari.",
  },
] as const;

export const caloriePlanSchema = z.object({
  method: z.literal("mifflin-st-jeor-v1"),
  calculatedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  age: z.number().int().min(18).max(100),
  bmr: z.number().positive(),
  maintenance: z.number().positive(),
  adjustment: z.number(),
  calorieTarget: z.number().int().min(1000).max(6000),
  goal: z.enum(["lose", "maintain", "gain"]),
  activity: z.number(),
  floorApplied: z.boolean(),
  explanation: z.string().max(1500),
  activityInsight: z.string().max(600).default(""),
  needsReview: z.boolean().default(false),
  reviewReason: z.string().max(600).default(""),
  explanationSource: z.enum(["ai", "formula"]),
});
export type CaloriePlan = z.infer<typeof caloriePlanSchema>;
export type PlanInput = Pick<
  Profile,
  | "birthDate"
  | "sex"
  | "height"
  | "weight"
  | "targetWeight"
  | "activity"
  | "bio"
> & { requiresClinicalPlan?: boolean };

export function ageOn(birthDate: string, day: string): number {
  const age = Number(day.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return age - (day.slice(5) < birthDate.slice(5) ? 1 : 0);
}

export function validatePlanInput(
  p: PlanInput,
  day: string,
): string | undefined {
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate) &&
    Number.isFinite(Date.parse(p.birthDate)) &&
    new Date(p.birthDate).toISOString().slice(0, 10) === p.birthDate;
  if (!valid || ageOn(p.birthDate, day) < 18 || ageOn(p.birthDate, day) > 100)
    return "Masukkan tanggal lahir yang valid. Perhitungan ini untuk usia 18–100 tahun.";
  if (!["male", "female"].includes(p.sex))
    return "Pilih jenis kelamin untuk perhitungan.";
  for (const [key, min, max, label] of [
    ["height", 100, 250, "Tinggi badan"],
    ["weight", 30, 350, "Berat badan"],
    ["targetWeight", 30, 350, "Target berat"],
  ] as const) {
    if (!Number.isFinite(p[key]) || p[key] < min || p[key] > max)
      return `${label} harus ${min}–${max} ${key === "height" ? "cm" : "kg"}.`;
  }
  if (!activityLevels.some((a) => a.value === p.activity))
    return "Pilih aktivitas sehari-hari.";
  if (p.bio && p.bio.length > 300)
    return "Cerita aktivitas maksimal 300 karakter.";
  if (p.requiresClinicalPlan)
    return "Kebutuhan nutrisi khusus perlu target dari tenaga kesehatan. Perhitungan otomatis tidak digunakan.";
  if (
    p.targetWeight < p.weight &&
    p.targetWeight / (p.height / 100) ** 2 < 18.5
  )
    return "Target penurunan berat terlalu rendah untuk tinggi badanmu. Sesuaikan target atau konsultasikan dulu.";
}

export function calculateCaloriePlan(p: PlanInput, day: string): CaloriePlan {
  const issue = validatePlanInput(p, day);
  if (issue) throw Error(issue);
  const age = ageOn(p.birthDate, day);
  const bmr =
    10 * p.weight + 6.25 * p.height - 5 * age + (p.sex === "male" ? 5 : -161);
  const maintenance = bmr * p.activity;
  const goal =
    p.targetWeight < p.weight
      ? "lose"
      : p.targetWeight > p.weight
        ? "gain"
        : "maintain";
  // Conservative app policy, not an AI prediction or a promise of weight-loss rate.
  const adjustment =
    goal === "lose"
      ? -Math.min(350, maintenance * 0.15)
      : goal === "gain"
        ? 250
        : 0;
  const floor = p.sex === "male" ? 1500 : 1200;
  const calorieTarget = Math.round(Math.max(floor, maintenance + adjustment));
  if (calorieTarget > 6000)
    throw Error(
      "Kebutuhan energi di luar rentang aplikasi. Konsultasikan target dengan tenaga kesehatan.",
    );
  return {
    method: "mifflin-st-jeor-v1",
    calculatedOn: day,
    age,
    bmr: Math.round(bmr),
    maintenance: Math.round(maintenance),
    adjustment: calorieTarget - Math.round(maintenance),
    calorieTarget,
    goal,
    activity: p.activity,
    floorApplied: maintenance + adjustment < floor,
    explanation:
      goal === "lose"
        ? "Target awal memakai pengurangan bertahap dari estimasi kebutuhan harian. Tinjau kembali berdasarkan catatan makan dan perubahan berat."
        : goal === "gain"
          ? "Target awal menambahkan energi dari estimasi kebutuhan harian untuk mendukung kenaikan berat bertahap."
          : "Target awal mengikuti estimasi kebutuhan harian untuk mempertahankan berat badan.",
    activityInsight: "",
    needsReview: false,
    reviewReason: "",
    explanationSource: "formula",
  };
}
