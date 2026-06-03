import { createClient } from "@supabase/supabase-js";

// Service-role client that bypasses RLS. Server-only — never import into a
// Client Component. Used for privileged actions like creating team-member
// auth accounts (PA/admin adding users).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
