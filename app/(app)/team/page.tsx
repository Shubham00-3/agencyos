import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import type { Profile } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { AddMemberDialog } from "@/components/team/add-member-dialog";
import { TeamView, type TeamMember } from "@/components/views/team-view";

export default async function TeamPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const canManage = can.manageTeam(profile.role);

  const [profilesRes, tasksRes] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("tasks").select("assignee_id").neq("status", "done"),
  ]);
  const profiles = (profilesRes.data as Profile[]) ?? [];
  const counts: Record<string, number> = {};
  ((tasksRes.data as { assignee_id: string | null }[]) ?? []).forEach((t) => {
    if (t.assignee_id) counts[t.assignee_id] = (counts[t.assignee_id] ?? 0) + 1;
  });

  const members: TeamMember[] = profiles.map((m) => ({
    id: m.id,
    full_name: m.full_name,
    avatar_color: m.avatar_color,
    role: m.role,
    count: counts[m.id] ?? 0,
  }));

  return (
    <>
      <PageHeader
        eyebrow={`${profiles.length} members`}
        title="Team"
        search="Search members…"
      >
        {canManage && <AddMemberDialog />}
      </PageHeader>
      <TeamView members={members} canManage={canManage} />
    </>
  );
}
