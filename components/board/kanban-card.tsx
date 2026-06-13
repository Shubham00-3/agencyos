"use client";

import { useState } from "react";
import type {
  AttachmentWithUrl,
  CommentWithAuthor,
  TaskWithAssignee,
} from "@/app/(app)/projects/[id]/page";
import { CategoryBadge } from "@/components/status-badge";
import { PersonAvatar } from "@/components/design";
import { Icon } from "@/components/icon";
import { formatDate, isOverdue } from "@/lib/format";
import type { Profile, UserRole } from "@/lib/types";
import { TaskDialog } from "@/components/projects/task-dialog";

export function KanbanCard({
  task,
  attachments,
  comments,
  projectId,
  projectLabel,
  assignees = [],
  currentUserId,
  currentUserRole,
  canManage = false,
  canWork,
}: {
  task: TaskWithAssignee;
  attachments: AttachmentWithUrl[];
  comments: CommentWithAuthor[];
  projectId: string;
  projectLabel?: string;
  assignees?: Profile[];
  currentUserId: string;
  currentUserRole: UserRole;
  canManage?: boolean;
  canWork: boolean;
}) {
  const [open, setOpen] = useState(false);
  const over = isOverdue(task.due_date) && task.status !== "done";
  const dueLabel =
    task.status === "done"
      ? "Done"
      : task.due_date
        ? formatDate(task.due_date)
        : "";

  return (
    <>
      <button className="kcard" onClick={() => setOpen(true)}>
        <div className="kcard-top">
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            {task.step_order != null && (
              <span className="catpill">Step {task.step_order + 1}</span>
            )}
            <CategoryBadge category={task.category} />
          </span>
          {task.assignee && (
            <PersonAvatar
              name={task.assignee.full_name}
              color={task.assignee.avatar_color}
              size={22}
            />
          )}
        </div>
        <div className="kt">{task.title}</div>
        {task.description && <div className="kdesc">{task.description}</div>}
        <div className="kcard-foot">
          {projectLabel ? (
            <span className="muted-sm ell">{projectLabel}</span>
          ) : (
            <span className="muted-sm" style={{ display: "flex", gap: 9 }}>
              {comments.length > 0 && (
                <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
                  <Icon d="chat" size={12} />
                  {comments.length}
                </span>
              )}
              {attachments.length > 0 && (
                <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
                  <Icon d="clip" size={12} />
                  {attachments.length}
                </span>
              )}
            </span>
          )}
          {dueLabel && (
            <span className={over ? "due over" : "muted-sm"}>{dueLabel}</span>
          )}
        </div>
      </button>

      <TaskDialog
        open={open}
        onOpenChange={setOpen}
        task={task}
        attachments={attachments}
        comments={comments}
        projectId={projectId}
        assignees={assignees}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        canManage={canManage}
        canWork={canWork}
      />
    </>
  );
}
