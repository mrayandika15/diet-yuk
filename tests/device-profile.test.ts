import test from "node:test";
import assert from "node:assert/strict";
import {
  restorePerson,
  profileCacheKey,
  connectionError,
} from "../src/lib/device-profile";
import { defaultProfile, validateProfile } from "../src/lib/domain";

test("restored session identity wins over an interrupted selection", () => {
  assert.equal(restorePerson("Anggun", "Raka"), "Raka");
  assert.equal(restorePerson("Raka", undefined), "Raka");
  assert.equal(restorePerson(null, "Anggun"), "Anggun");
  assert.equal(restorePerson("Unknown", null), null);
});

test("device profile caches are scoped to the authenticated owner", () => {
  assert.notEqual(
    profileCacheKey("phone-raka"),
    profileCacheKey("phone-anggun"),
  );
});

test("bio accepts old profiles and validates its length", () => {
  const profile = { ...defaultProfile, name: "Raka" };
  assert.equal(validateProfile(profile), undefined);
  assert.equal(
    validateProfile({ ...profile, bio: "Sehat bareng Anggun" }),
    undefined,
  );
  assert.equal(
    validateProfile({ ...profile, bio: "a".repeat(301) }),
    "Bio maksimal 300 karakter.",
  );
});

test("setup errors explain the actual missing dependency", () => {
  assert.match(
    connectionError({ code: "anonymous_provider_disabled" }),
    /Anonymous/,
  );
  assert.match(connectionError({ code: "PGRST205" }), /migrasi/);
});
