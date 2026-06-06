"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can } from "@/lib/permissions";
import { AVATAR_COLORS } from "@/lib/constants";
import type { Profile, UserRole } from "@/lib/types";

// Strong, URL-safe random password (~96 bits) for accounts created without an
// explicit one. The new member changes it after first sign-in.
function generateTempPassword() {
  return randomBytes(12).toString("base64url");
}

export async function addTeamMemberAction(input: {
  full_name: string;
  email: string;
  role: UserRole;
  password?: string;
}): Promise<{ error: string } | { tempPassword?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // The service-role client bypasses RLS, so verify the caller is allowed.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!me || !can.manageTeam((me as Profile).role)) {
    return { error: "You don't have permission to add team members." };
  }

  const provided = input.password?.trim();
  const password = provided || generateTempPassword();

  const admin = createAdminClient();
  const color =
    AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const { error } = await admin.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      role: input.role,
      avatar_color: color,
    },
  });
  if (error) return { error: error.message };

  revalidatePath("/team");
  // Only return the password when we generated it, so the admin can share it.
  return { tempPassword: provided ? undefined : password };
}
