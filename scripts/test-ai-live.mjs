// Tests a temporary photo-analysis job only; never creates meals or changes profiles.
// Server key comes from the private deployment file and must never enter the web bundle.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(
  (await readFile(".local/managed-ai/ai-worker.env", "utf8"))
    .trim()
    .split("\n")
    .map((line) => {
      const p = line.indexOf("=");
      return [line.slice(0, p), line.slice(p + 1)];
    }),
);
const client = createClient(
  env.DIET_YUK_SUPABASE_URL,
  env.DIET_YUK_SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const users = await client.auth.admin.listUsers();
assert.ifError(users.error);
const owner = users.data.users.find(
  (u) =>
    u.email === "mrayandika.work@gmail.com" &&
    u.app_metadata.provider === "google",
);
assert.ok(
  owner,
  "A real Google user must have logged in before this smoke test",
);
const jobId = randomUUID();
const started = Date.now();
try {
  const health = await client
    .from("ai_worker_status")
    .select("last_seen")
    .single();
  assert.ifError(health.error);
  assert.ok(
    Date.now() - Date.parse(health.data.last_seen) < 45000,
    "Worker heartbeat is stale",
  );
  const image = (await readFile(".local/managed-ai/banana.jpg")).toString(
    "base64",
  );
  const inserted = await client
    .from("ai_analysis_jobs")
    .insert({ id: jobId, user_id: owner.id, image_base64: image });
  assert.ifError(inserted.error);
  console.log("Test photo queued; waiting for VPS analysis");
  while (Date.now() - started < 240000) {
    await new Promise((r) => setTimeout(r, 2000));
    const job = await client
      .from("ai_analysis_jobs")
      .select("status,result,error,image_base64")
      .eq("id", jobId)
      .single();
    assert.ifError(job.error);
    if (job.data.status === "failed") throw Error(job.data.error);
    if (job.data.status === "completed") {
      assert.equal(
        job.data.image_base64,
        null,
        "Processed photo must be cleared",
      );
      assert.ok(
        job.data.result.items.some((item) => /pisang|banana/i.test(item.name)),
        "AI did not recognize the test bananas",
      );
      console.log(
        JSON.stringify({
          status: "PASS",
          seconds: Math.round((Date.now() - started) / 1000),
          items: job.data.result.items.map((i) => ({
            name: i.name,
            portion_g: i.portion_g,
            calories: i.calories,
          })),
          photoCleared: true,
        }),
      );
      break;
    }
  }
  assert.ok(Date.now() - started < 240000, "AI timed out");
} finally {
  const cleanup = await client
    .from("ai_analysis_jobs")
    .delete()
    .eq("id", jobId);
  assert.ifError(cleanup.error);
  console.log("Temporary analysis job removed");
}
