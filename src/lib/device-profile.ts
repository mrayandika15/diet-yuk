import { isPerson, Person } from "./personal";

export const devicePersonKey = "diet-yuk:person";
export const profileCacheKey = (userId: string) =>
  "diet-yuk:cloud-profile:" + userId;

export function restorePerson(
  saved: string | null,
  metadataName: unknown,
): Person | null {
  // A restored session owns the choice, even if a different attempt was
  // interrupted before sign-in finished.
  if (isPerson(metadataName)) return metadataName;
  return isPerson(saved) ? saved : null;
}

export function connectionError(reason: { message?: string; code?: string }) {
  if (reason.code === "anonymous_provider_disabled")
    return "Login perangkat belum aktif. Aktifkan Anonymous Sign-Ins di Supabase.";
  if (["PGRST205", "PGRST202", "42P01"].includes(reason.code ?? ""))
    return "Database belum siap. Jalankan migrasi Supabase lalu coba lagi.";
  return (
    reason.message || "Belum bisa terhubung. Periksa internet lalu coba lagi."
  );
}
