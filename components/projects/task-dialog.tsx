"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Paperclip,
  Download,
  Trash2,
  MessageSquare,
  Send,
  CalendarClock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AttachmentWithUrl,
  CommentWithAuthor,
  TaskWithAssignee,
} from "@/app/(app)/projects/[id]/page";
import {
  addCommentAction,
  deleteAttachmentAction,
  updateTaskStatusAction,
} from "@/app/(app)/projects/actions";
import { TASK_STATUS_ORDER } from "@/lib/constants";
import type { TaskStatus } from "@/lib/types";
import { formatDate, formatBytes, isOverdue, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CategoryBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { TASK_STATUS } from "@/lib/constants";
import { FileUpload } from "./file-upload";

export function TaskDialog({
  open,
  onOpenChange,
  task,
  attachments,
  comments,
  projectId,
  currentUserId,
  canEditStatus,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: TaskWithAssignee;
  attachments: AttachmentWithUrl[];
  comments: CommentWithAuthor[];
  projectId: string;
  currentUserId: string;
  canEditStatus: boolean;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  async function changeStatus(status: TaskStatus) {
    const res = await updateTaskStatusAction({
      task_id: task.id,
      project_id: projectId,
      status,
    });
    if (res.error) return toast.error(res.error);
    toast.success(`Moved to "${TASK_STATUS[status].label}"`);
    router.refresh();
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    const res = await addCommentAction({
      task_id: task.id,
      project_id: projectId,
      body: comment.trim(),
    });
    setSending(false);
    if (res.error) return toast.error(res.error);
    setComment("");
    router.refresh();
  }

  async function removeFile(a: AttachmentWithUrl) {
    const res = await deleteAttachmentAction({
      id: a.id,
      storage_path: a.storage_path,
      project_id: projectId,
    });
    if (res.error) return toast.error(res.error);
    toast.success("File removed");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto scrollbar-thin sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CategoryBadge category={task.category} />
            {task.due_date && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs",
                  isOverdue(task.due_date) && task.status !== "done"
                    ? "text-destructive font-medium"
                    : "text-muted-foreground",
                )}
              >
                <CalendarClock className="size-3.5" />
                {formatDate(task.due_date)}
              </span>
            )}
          </div>
          <DialogTitle className="text-left">{task.title}</DialogTitle>
        </DialogHeader>

        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        )}

        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            {task.assignee ? (
              <>
                <UserAvatar
                  name={task.assignee.full_name}
                  color={task.assignee.avatar_color}
                  className="size-6"
                />
                <span className="text-sm">{task.assignee.full_name}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Unassigned</span>
            )}
          </div>
          <Select
            value={task.status}
            onValueChange={(v) => changeStatus(v as TaskStatus)}
            disabled={!canEditStatus}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {TASK_STATUS[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Files */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Paperclip className="size-4 text-muted-foreground" />
              Files ({attachments.length})
            </p>
            <FileUpload taskId={task.id} projectId={projectId} />
          </div>
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No files uploaded yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {a.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(a.file_size)} · {relativeTime(a.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {a.url && (
                      <Button
                        render={
                          <a href={a.url} target="_blank" rel="noreferrer" download />
                        }
                        size="icon"
                        variant="ghost"
                        className="size-7"
                      >
                        <Download className="size-3.5" />
                      </Button>
                    )}
                    {(a.uploaded_by === currentUserId || canEditStatus) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFile(a)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        {/* Comments */}
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <MessageSquare className="size-4 text-muted-foreground" />
            Comments ({comments.length})
          </p>
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <UserAvatar
                name={c.author?.full_name ?? "?"}
                color={c.author?.avatar_color ?? "#888"}
                className="size-7"
              />
              <div className="min-w-0">
                <p className="text-xs">
                  <span className="font-medium">
                    {c.author?.full_name ?? "Someone"}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {relativeTime(c.created_at)}
                  </span>
                </p>
                <p className="text-sm">{c.body}</p>
              </div>
            </div>
          ))}
          <form onSubmit={postComment} className="flex gap-2">
            <Input
              placeholder="Write a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button type="submit" size="icon" disabled={sending}>
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
