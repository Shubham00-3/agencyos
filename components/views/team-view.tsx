"use client";

import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import { PersonAvatar } from "@/components/design";
import { Icon } from "@/components/icon";
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
    <>
      <div className="cardgrid grid-tight">
        {list.map((m) => (
          <div className="card teamcard" key={m.id}>
            <PersonAvatar name={m.full_name} color={m.avatar_color} size={52} />
            <div className="min0">
              <div className="tc-name ell">{m.full_name}</div>
              <div className="tc-role">{ROLE_LABELS[m.role]}</div>
            </div>
            <div className="tc-tasks">
              <Icon d="clip" />
              {m.count} active task{m.count !== 1 ? "s" : ""}
            </div>
          </div>
        ))}
        {canManage && <AddMemberDialog variant="ghost" />}
      </div>

      <div className="tip-banner">
        <span className="tip-ic">
          <Icon d="team" />
        </span>
        <span className="tip-txt">
          <b>Tip:</b> Assign teammates to project tasks to track everyone&apos;s
          workload at a glance. Keep your team organized and projects moving
          forward.
        </span>
        {canManage && <AddMemberDialog />}
      </div>
    </>
  );
}
