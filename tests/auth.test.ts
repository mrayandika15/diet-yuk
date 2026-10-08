import test from "node:test";
import assert from "node:assert/strict";
import { googlePerson } from "../src/lib/auth";
const user = {
  email: "mrayandika.work@gmail.com",
  email_confirmed_at: "2026-10-08",
  is_anonymous: false,
  app_metadata: { provider: "google" },
};
test("Google accounts map to their fixed profiles", () => {
  assert.equal(googlePerson(user), "Raka");
  assert.equal(
    googlePerson({ ...user, email: "ANGGUN.RIZKYE@gmail.com" }),
    "Anggun",
  );
});
test("reject other emails, anonymous, unverified and non-Google sessions", () => {
  assert.equal(googlePerson(null), null);
  assert.equal(googlePerson({ ...user, email: "stranger@gmail.com" }), null);
  assert.equal(
    googlePerson({ ...user, email: "mrayandika.work+other@gmail.com" }),
    null,
  );
  assert.equal(googlePerson({ ...user, is_anonymous: true }), null);
  assert.equal(googlePerson({ ...user, email_confirmed_at: undefined }), null);
  assert.equal(
    googlePerson({
      ...user,
      app_metadata: { provider: "email", person: "Raka" },
    }),
    null,
  );
});
