"use client";

import type {
  AttachmentWithUrl,
  CommentWithAuthor,
  TaskWithAssignee,
} from "@/app/(app)/projects/[id]/page";
import { TASK_STATUS, TASK_STATUS_ORDER } from "@/lib/constants";
import { KanbanCard } from "@/components/board/kanban-card";

export type BoardTask = TaskWithAssignee & {
  projectLabel: string;
};

export function TasksBoard({
  tasks,
  attachmentsByTask,
  commentsByTask,
  currentUserId,
  canManage,
}: {
  tasks: BoardTask[];
  attachmentsByTask: Record<string, AttachmentWithUrl[]>;
  commentsByTask: Record<string, CommentWithAuthor[]>;
  currentUserId: string;
  canManage: boolean;
}) {
  return (
    <div className="board">
      {TASK_STATUS_ORDER.map((st) => {
        const group = tasks.filter((t) => t.status === st);
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
                  currentUserId={currentUserId}
                  canEditStatus={canManage || t.assignee?.id === currentUserId}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
