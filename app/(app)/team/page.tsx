import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { PersonAvatar } from "@/components/design";
import { AddMemberDialog } from "@/components/team/add-member-dialog";

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

  return (
    <>
      <PageHeader
        eyebrow={`${profiles.length} members`}
        title="Team"
        search="Search members…"
      >
        {canManage && <AddMemberDialog />}
      </PageHeader>

      <div className="grid grid-tight">
        {profiles.map((m) => (
          <div className="card teamcard" key={m.id}>
            <PersonAvatar name={m.full_name} color={m.avatar_color} size={48} />
            <div className="min0">
              <div className="fw6">{m.full_name}</div>
              <div className="muted-sm">{ROLE_LABELS[m.role]}</div>
              <div className="muted-sm" style={{ marginTop: 4 }}>
                {counts[m.id] ?? 0} active task
                {(counts[m.id] ?? 0) !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        ))}
        {canManage && <AddMemberDialog variant="ghost" />}
      </div>
    </>
  );
}
