"use client";

import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import { PersonAvatar } from "@/components/design";
import { AddMemberDialog } from "@/components/team/add-member-dialog";
import { useSearch, matches } from "@/components/search/search-context";

export type TeamMember = {
  id: string;
  full_name: string;
  avatar_color: string;
  role: UserRole;
  count: number;
};

export function TeamView({
  members,
  canManage,
}: {
  members: TeamMember[];
  canManage: boolean;
}) {
  const { q } = useSearch();
  const list = members.filter((m) =>
    matches(q, m.full_name, ROLE_LABELS[m.role]),
  );

  return (
    <div className="grid grid-tight">
      {list.map((m) => (
        <div className="card teamcard" key={m.id}>
          <PersonAvatar name={m.full_name} color={m.avatar_color} size={48} />
          <div className="min0">
            <div className="fw6">{m.full_name}</div>
            <div className="muted-sm">{ROLE_LABELS[m.role]}</div>
            <div className="muted-sm" style={{ marginTop: 4 }}>
              {m.count} active task{m.count !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      ))}
      {canManage && <AddMemberDialog variant="ghost" />}
    </div>
  );
}
