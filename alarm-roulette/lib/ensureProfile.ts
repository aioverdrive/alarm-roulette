import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

/**
 * Ensures a `profiles` row exists after OAuth or email login.
 * Safe on `/alarms` where `SupabaseAuth` never mounts, and idempotent if the
 * DB trigger already inserted the row (handles unique conflicts → update).
 */
export async function ensureProfileForUser(user: User): Promise<void> {
  const email = user.email ?? null;
  const fullName =
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null) ??
    (typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : null);

  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata?.picture === "string"
        ? user.user_metadata.picture
        : null;

  const { data: existing, error: selErr } = await supabaseBrowser
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (selErr) {
    console.error("[ensureProfileForUser] select", selErr);
    return;
  }

  const patch = {
    email,
    full_name: fullName,
    avatar_url: avatarUrl,
  };

  if (existing) {
    const { error } = await supabaseBrowser
      .from("profiles")
      .update(patch)
      .eq("user_id", user.id);

    if (error) console.error("[ensureProfileForUser] update", error);
    return;
  }

  const { error: insErr } = await supabaseBrowser.from("profiles").insert({
    user_id: user.id,
    ...patch,
  });

  if (!insErr) return;

  // Trigger may have created the row between select and insert.
  const dup =
    insErr.code === "23505" ||
    (typeof insErr.message === "string" &&
      insErr.message.toLowerCase().includes("duplicate"));

  if (dup) {
    const { error: upErr } = await supabaseBrowser
      .from("profiles")
      .update(patch)
      .eq("user_id", user.id);

    if (upErr) console.error("[ensureProfileForUser] update after conflict", upErr);
    return;
  }

  console.error("[ensureProfileForUser] insert", insErr);
}
