import { supabase } from "./supabase";
import { analysisSchema, uuid, dayKey } from "./domain";
import { MenuResult, Preparation } from "./food-search";
import {
  caloriePlanSchema,
  calculateCaloriePlan,
  PlanInput,
} from "./calorie-plan";

export async function testAI() {
  if (!supabase) throw Error("Koneksi Supabase belum dikonfigurasi.");
  const { data, error } = await supabase.rpc("ai_status");
  if (error)
    throw Error("Tidak dapat memeriksa analisis foto. Coba lagi sebentar.");
  if (!data?.available)
    throw Error("Analisis foto sedang tidak tersedia. Coba lagi sebentar.");
  return "Analisis foto siap digunakan";
}

export async function analyze(base64: string) {
  if (!supabase) throw Error("Masuk ke akun terlebih dahulu.");
  const queued = await supabase.rpc("queue_food_analysis", {
    image: base64,
    request_id: uuid(),
  });
  if (queued.error) throw Error(queued.error.message);
  return {
    ...analysisSchema.parse(await waitForResult(queued.data)),
    jobId: queued.data as string,
  };
}

export async function refineAnalysis(
  jobId: string,
  answers: Record<string, string>,
) {
  if (!supabase) throw Error("Masuk ke akun terlebih dahulu.");
  const queued = await supabase.rpc("queue_food_refinement", {
    original_job: jobId,
    answers,
    request_id: uuid(),
  });
  if (queued.error) throw Error(queued.error.message);
  return analysisSchema.parse(await waitForResult(queued.data));
}

export async function estimateMenu(
  menu: MenuResult,
  preparation: Preparation,
  signal: AbortSignal,
) {
  if (!supabase) throw Error("Masuk ke akun terlebih dahulu.");
  signal.throwIfAborted();
  const queued = await supabase.rpc("queue_catalog_estimate", {
    selection: { kind: menu.kind, id: menu.id, preparation },
    request_id: uuid(),
  });
  if (queued.error) throw Error(queued.error.message);
  const result = analysisSchema.parse(await waitForResult(queued.data, signal));
  if (
    result.items.length !== 1 ||
    result.items[0].portion_g !== 100 ||
    !result.items[0].image_url
  )
    throw Error("Estimasi menu belum lengkap. Coba lagi.");
  return {
    food: { ...result.items[0], source: "ai" as const },
    notes: result.notes,
  };
}

async function waitForResult(jobId: string, signal?: AbortSignal) {
  if (!supabase) throw Error("Koneksi Supabase belum dikonfigurasi.");
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    signal?.throwIfAborted();
    const response = await supabase.rpc("food_analysis_result", {
      job_id: jobId,
    });
    if (response.error)
      throw Error("Koneksi analisis terputus. Coba lagi sebentar.");
    if (response.data?.status === "completed") return response.data.result;
    if (response.data?.status === "failed")
      throw Error(response.data.error || "Analisis gagal. Silakan coba lagi.");
  }
  throw Error("Analisis terlalu lama. Silakan coba lagi.");
}

export async function planCalories(input: PlanInput) {
  const expected = calculateCaloriePlan(input, dayKey());
  if (!supabase) throw Error("Masuk ke akun terlebih dahulu.");
  const queued = await supabase.rpc("queue_calorie_plan", {
    profile: input,
    request_id: uuid(),
  });
  if (queued.error) throw Error(queued.error.message);
  const plan = caloriePlanSchema.parse(await waitForResult(queued.data));
  // The model supplies prose only; authoritative numbers must match the formula.
  const recalculated = calculateCaloriePlan(input, plan.calculatedOn);
  if (
    plan.calorieTarget !== recalculated.calorieTarget ||
    plan.bmr !== recalculated.bmr ||
    plan.maintenance !== recalculated.maintenance ||
    plan.activity !== expected.activity
  )
    throw Error("Hasil perhitungan belum sesuai profil. Silakan hitung ulang.");
  return plan;
}
