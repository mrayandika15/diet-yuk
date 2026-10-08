// Creates isolated anonymous test users, then deletes only those fixtures.
// Run: node --env-file=.env scripts/test-supabase-live.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(url && key, "Load .env first.");
const ref = new URL(url).hostname.split(".")[0];
assert.equal(
  (await readFile("supabase/.temp/project-ref", "utf8")).trim(),
  ref,
);
const users = [];
const clients = [];
const objects = [];
let coupleId;
const tag = "device-smoke-" + randomUUID();

function client(storage = new Map()) {
  const c = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
        removeItem: (key) => {
          storage.delete(key);
        },
      },
    },
  });
  clients.push(c);
  return c;
}
function check(result) {
  if (result.error) throw Error(result.error.message);
  return result.data;
}
function profile(name) {
  return {
    name,
    bio: tag,
    sex: "male",
    birthDate: "1998-01-01",
    height: 170,
    weight: 70,
    targetWeight: 65,
    activity: 1.375,
    calorieTarget: 1900,
    weddingDate: "2027-09-26",
  };
}
async function signIn(c, name) {
  const data = check(
    await c.auth.signInAnonymously({
      options: { data: { person: name, smoke_test: tag } },
    }),
  );
  users.push(data.user.id);
  return data.user.id;
}
try {
  const rakaStorage = new Map();
  const raka = client(rakaStorage);
  const rakaId = await signIn(raka, "Raka");
  check(
    await raka.from("profiles").upsert({ id: rakaId, data: profile("Raka") }),
  );

  // A new SDK instance represents closing/reopening the same phone browser.
  const reopened = client(rakaStorage);
  const restored = check(await reopened.auth.getSession());
  assert.equal(restored.session.user.id, rakaId);
  assert.equal(restored.session.user.user_metadata.person, "Raka");
  check(await reopened.auth.refreshSession());
  const savedProfile = check(
    await reopened.from("profiles").select("data").eq("id", rakaId).single(),
  );
  assert.equal(savedProfile.data.bio, tag);
  assert.equal(savedProfile.data.name, "Raka");
  console.log("PASS Raka session, token refresh, and bio survive reopening");

  const anggunStorage = new Map();
  const anggun = client(anggunStorage);
  const anggunId = await signIn(anggun, "Anggun");
  check(
    await anggun
      .from("profiles")
      .upsert({ id: anggunId, data: profile("Anggun") }),
  );
  const anggunReopened = client(anggunStorage);
  assert.equal(
    check(await anggunReopened.auth.getSession()).session.user.id,
    anggunId,
  );
  assert.equal(
    check(
      await anggunReopened
        .from("profiles")
        .select("data")
        .eq("id", anggunId)
        .single(),
    ).data.name,
    "Anggun",
  );
  assert.equal(
    check(await anggun.from("profiles").select("id").eq("id", rakaId)).length,
    0,
  );
  console.log(
    "PASS Anggun has a separate persisted session and cannot read unpaired Raka data",
  );

  const mealId = randomUUID();
  const photoPath = rakaId + "/" + mealId + "-" + randomUUID() + ".jpg";
  // Minimal JPEG fixture; testing Storage policies and signed URL access.
  const photo = Buffer.from("/9j/2Q==", "base64");
  check(
    await reopened.storage
      .from("meal-photos")
      .upload(photoPath, photo, { contentType: "image/jpeg" }),
  );
  objects.push({ client: reopened, path: photoPath });
  const meal = {
    id: mealId,
    date: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
    type: "lunch",
    photoPath,
    note: tag,
    items: [
      {
        name: "Nasi putih",
        portion_g: 150,
        calories: 195,
        protein_g: 4,
        carbs_g: 42,
        fat_g: 0.5,
      },
    ],
  };
  check(await reopened.rpc("save_meal", { meal }));
  check(await reopened.rpc("save_meal", { meal }));
  const savedMeals = check(
    await reopened.from("meals").select("*").eq("id", mealId),
  );
  assert.equal(savedMeals.length, 1);
  assert.equal(savedMeals[0].photo_path, photoPath);
  const signed = check(
    await reopened.storage.from("meal-photos").createSignedUrl(photoPath, 60),
  );
  assert.equal((await fetch(signed.signedUrl)).status, 200);
  check(
    await reopened.rpc("save_meal", {
      meal: { ...meal, note: tag + "-edited" },
    }),
  );
  assert.equal(
    check(await reopened.from("meals").select("note").eq("id", mealId).single())
      .note,
    tag + "-edited",
  );
  console.log(
    "PASS photo upload, signed URL, meal save/edit, and duplicate-save protection",
  );

  check(
    await reopened
      .from("weight_logs")
      .upsert({ user_id: rakaId, logged_on: meal.date, weight_kg: 69 }),
  );
  check(
    await reopened
      .from("favorites")
      .upsert({ user_id: rakaId, name: "Nasi putih", food: meal.items[0] }),
  );
  assert.equal(
    check(
      await reopened
        .from("weight_logs")
        .select("weight_kg")
        .eq("user_id", rakaId),
    ).length,
    1,
  );
  assert.equal(
    check(await reopened.from("favorites").select("name").eq("user_id", rakaId))
      .length,
    1,
  );
  console.log("PASS weight and favorites persist");

  coupleId = check(await reopened.rpc("create_couple"));
  const couple = check(
    await reopened
      .from("couples")
      .select("invite_code")
      .eq("id", coupleId)
      .single(),
  );
  check(await anggun.rpc("join_couple", { code: couple.invite_code }));
  const summary = check(await anggun.rpc("couple_summary"));
  assert.equal(summary.name, "Raka");
  assert.equal(summary.calories, 195);
  const blocked = await anggun.rpc("save_meal", {
    meal: { ...meal, note: "unauthorized" },
  });
  assert.ok(blocked.error, "Partner must not overwrite another owner.");
  check(await anggun.rpc("send_cheer", { emoji: "❤️" }));
  assert.equal(
    check(
      await reopened.from("cheers").select("emoji").eq("to_user", rakaId),
    )[0].emoji,
    "❤️",
  );
  console.log("PASS pairing, partner summary, cheers, and owner-only editing");

  const publicClient = client();
  const publicRead = await publicClient.from("profiles").select("id");
  assert.ok(publicRead.error || publicRead.data.length === 0);
  check(await reopened.from("meals").delete().eq("id", mealId));
  assert.equal(
    check(await reopened.from("meals").select("id").eq("id", mealId)).length,
    0,
  );
  console.log("PASS public access blocked and meal delete verified");
} finally {
  for (const object of objects)
    check(
      await object.client.storage.from("meal-photos").remove([object.path]),
    );
  if (users.length) {
    assert.ok(users.every((id) => /^[a-f0-9-]{36}$/.test(id)));
    const directory = await mkdtemp(join(tmpdir(), "diet-yuk-smoke-"));
    try {
      const file = join(directory, "cleanup.sql");
      const ids = users.map((id) => "'" + id + "'").join(",");
      await writeFile(
        file,
        "begin; delete from auth.users where id in (" +
          ids +
          ") and raw_user_meta_data->>'smoke_test' = '" +
          tag +
          "';" +
          (coupleId
            ? "delete from public.couples where id='" +
              coupleId +
              "' and not exists(select 1 from public.couple_members where couple_id='" +
              coupleId +
              "');"
            : "") +
          "commit;",
      );
      execFileSync(
        "npx",
        ["supabase", "db", "query", "--linked", "--file", file],
        { stdio: "pipe" },
      );
      console.log(
        "PASS removed only this run's test users, records, and photos",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  for (const c of clients) {
    c.auth.stopAutoRefresh();
    await c.removeAllChannels();
  }
}
