import type { User } from "@supabase/supabase-js";
import type { Person } from "./personal";

export const accessDeniedMessage =
  "Akses hanya untuk akun Google Raka dan Anggun yang terdaftar. Silakan masuk dengan akun yang sesuai.";

// Keep in sync with the database allowlist migration.
export function googlePerson(
  user?: Pick<
    User,
    "email" | "is_anonymous" | "app_metadata" | "email_confirmed_at"
  > | null,
): Person | null {
  if (
    !user ||
    user.is_anonymous ||
    !user.email_confirmed_at ||
    user.app_metadata.provider !== "google"
  )
    return null;
  switch (user.email?.toLowerCase()) {
    case "mrayandika.work@gmail.com":
      return "Raka";
    case "anggun.rizkye@gmail.com":
      return "Anggun";
    default:
      return null;
  }
}
