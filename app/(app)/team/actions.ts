"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can } from "@/lib/permissions";
import { AVATAR_COLORS } from "@/lib/constants";
import type { Profile, UserRole } from "@/lib/types";

export async function addTeamMemberAction(input: {
  full_name: string;
  email: string;
  role: UserRole;
  password?: string;
}) {
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

  const admin = createAdminClient();
  const color =
    AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const { error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password || "password123",
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      role: input.role,
      avatar_color: color,
    },
  });
  if (error) return { error: error.message };

  revalidatePath("/team");
  return {};
}
