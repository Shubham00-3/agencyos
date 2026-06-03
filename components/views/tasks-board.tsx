"use client";

import { useState } from "react";
import type {
  AttachmentWithUrl,
  CommentWithAuthor,
  TaskWithAssignee,
} from "@/app/(app)/projects/[id]/page";
import type { Profile } from "@/lib/types";
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
  canManage,
}: {
  tasks: BoardTask[];
  attachmentsByTask: Record<string, AttachmentWithUrl[]>;
  commentsByTask: Record<string, CommentWithAuthor[]>;
  assignees: Profile[];
  currentUserId: string;
  canManage: boolean;
}) {
  const { q } = useSearch();
  const [mine, setMine] = useState(false);
  const visible = tasks
    .filter((t) => !mine || t.assignee?.id === currentUserId)
    .filter((t) =>
      matches(q, t.title, t.description, t.assignee?.full_name, t.projectLabel),
    );

  return (
    <>
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
      <div className="board">
        {TASK_STATUS_ORDER.map((st) => {
          const group = visible.filter((t) => t.status === st);
          const s = TASK_STATUS[st];
          return (
            <div className="bcol" key={st}>
              <div className="bcol-head">
                <span className="dot" style={{ background: s.dot }} />
                <span className="fw6">{s.label}</span>
                <span className="muted-sm tnum">{group.length}</span>
              </div>
              <div className="bcol-body">
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
                    canManage={canManage}
                    canEditStatus={canManage || t.assignee?.id === currentUserId}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
