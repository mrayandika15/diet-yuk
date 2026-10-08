// Read-only checks; complete Google consent in the browser for end-to-end testing.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(url && key, "Load .env first.");
const client = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
for (const table of [
  "profiles",
  "meals",
  "weight_logs",
  "couples",
  "couple_members",
  "cheers",
  "favorites",
]) {
  const result = await client.from(table).select("*").limit(1);
  assert.ok(
    result.error || result.data.length === 0,
    `Public access exposed ${table}`,
  );
}
for (const table of ["ai_analysis_jobs", "ai_worker_status"]) {
  const result = await client.from(table).select("*").limit(1);
  assert.ok(
    result.error || result.data.length === 0,
    `Public access exposed ${table}`,
  );
}
assert.ok(
  (await client.rpc("ai_status")).error,
  "Anonymous requests can access AI status",
);
assert.ok(
  (await client.rpc("claim_food_analysis")).error,
  "Anonymous requests can claim AI jobs",
);
console.log("PASS anonymous requests cannot read application data");
const response = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: key },
});
assert.ok(response.ok, "Cannot read Auth configuration");
const settings = await response.json();
assert.equal(
  settings.external?.google,
  true,
  "Enable Google provider in Supabase dashboard",
);
assert.equal(
  settings.external?.anonymous_users,
  false,
  "Disable Anonymous Sign-Ins in Supabase dashboard",
);
assert.equal(
  settings.external?.email,
  false,
  "Disable Email provider in Supabase dashboard",
);
console.log("PASS Google enabled; anonymous and email providers disabled");
console.log(
  "Browser OAuth consent and Auth Hook activation still require end-to-end verification.",
);
