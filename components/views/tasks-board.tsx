"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type {
  AttachmentWithUrl,
  CommentWithAuthor,
  TaskWithAssignee,
} from "@/app/(app)/projects/[id]/page";
import type { Profile, UserRole, TaskStatus } from "@/lib/types";
import { TASK_STATUS, TASK_STATUS_ORDER } from "@/lib/constants";
import { KanbanCard } from "@/components/board/kanban-card";
import { useSearch, matches } from "@/components/search/search-context";

export type BoardTask = TaskWithAssignee & {
  projectLabel: string;
};

export function TasksBoard({
  tasks,
  attachmentsByTask,
  commentsByTask,
  assignees,
  currentUserId,
  currentUserRole,
  canManage,
  canSeeAllTasks,
}: {
  tasks: BoardTask[];
  attachmentsByTask: Record<string, AttachmentWithUrl[]>;
  commentsByTask: Record<string, CommentWithAuthor[]>;
  assignees: Profile[];
  currentUserId: string;
  currentUserRole: UserRole;
  canManage: boolean;
  canSeeAllTasks: boolean;
}) {
  const { q } = useSearch();
  const [mine, setMine] = useState(false);
  // Sections start collapsed; clicking a header expands it (animated).
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (st: TaskStatus) =>
    setOpen((o) => ({ ...o, [st]: !o[st] }));

  const visible = tasks
    .filter((t) => !mine || t.assignee?.id === currentUserId)
    .filter((t) =>
      matches(q, t.title, t.description, t.assignee?.full_name, t.projectLabel),
    );

  return (
    <>
      {canSeeAllTasks && (
        <div className="filterbar" style={{ marginTop: 4 }}>
          <div className="chips">
            <button
              className={"chip" + (!mine ? " on" : "")}
              onClick={() => setMine(false)}
            >
              All tasks
            </button>
            <button
              className={"chip" + (mine ? " on" : "")}
              onClick={() => setMine(true)}
            >
              My tasks
              <span className="c">
                {tasks.filter((t) => t.assignee?.id === currentUserId).length}
              </span>
            </button>
          </div>
        </div>
      )}
      <div className="taskacc">
        {TASK_STATUS_ORDER.map((st) => {
          const group = visible.filter((t) => t.status === st);
          const s = TASK_STATUS[st];
          const isOpen = !!open[st];
          return (
            <div className={"accsec" + (isOpen ? " open" : "")} key={st}>
              <button
                type="button"
                className="acchead"
                onClick={() => toggle(st)}
                aria-expanded={isOpen}
              >
                <span className="dot" style={{ background: s.dot }} />
                <span className="fw6">{s.label}</span>
                <span className="muted-sm tnum">{group.length}</span>
                <ChevronDown className="accchev" />
              </button>
              <div className="accpanel">
                <div className="accpanel-inner">
                  {group.length === 0 ? (
                    <p className="accempty">No tasks here.</p>
                  ) : (
                    <div className="acccards">
                      {group.map((t) => (
                        <KanbanCard
                          key={t.id}
                          task={t}
                          projectId={t.project_id}
                          projectLabel={t.projectLabel}
                          attachments={attachmentsByTask[t.id] ?? []}
                          comments={commentsByTask[t.id] ?? []}
                          assignees={assignees}
                          currentUserId={currentUserId}
                          currentUserRole={currentUserRole}
                          canManage={canManage}
                          canWork={
                            currentUserRole === "developer" ||
                            t.assignee?.id === currentUserId
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
