import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { PageHeader, EmptyState } from "@/components/page-header";
import { TasksBoard, type BoardTask } from "@/components/views/tasks-board";
import { GlobalAddTaskDialog } from "@/components/projects/global-add-task-dialog";
import type {
  AttachmentWithUrl,
  CommentWithAuthor,
  TaskWithAssignee,
} from "@/app/(app)/projects/[id]/page";
import type { Profile, TaskAttachment } from "@/lib/types";

type TaskProjectOption = {
  id: string;
  name: string;
  client: { business_name: string } | null;
};

export default async function TasksPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const canManage = can.manageTasks(profile.role);

  let assignees: Profile[] = [];
  let projectOptions: TaskProjectOption[] = [];
  if (canManage) {
    const [profilesRes, projectsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase
        .from("projects")
        .select("id, name, client:clients(business_name)")
        .order("created_at", { ascending: false }),
    ]);
    assignees = (profilesRes.data as Profile[]) ?? [];
    projectOptions = (projectsRes.data as unknown as TaskProjectOption[]) ?? [];
  }

  const { data: tasksData } = await supabase
    .from("tasks")
    .select(
      "*, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_color), project:projects(id, name, client:clients(business_name))",
    )
    .order("due_date", { ascending: true, nullsFirst: false });

  const raw =
    (tasksData as unknown as (TaskWithAssignee & {
      project: { id: string; name: string; client: { business_name: string } | null } | null;
    })[]) ?? [];

  const tasks: BoardTask[] = raw.map((t) => ({
    ...t,
    projectLabel: `${t.project?.client?.business_name?.[0] ?? "?"} · ${t.project?.name ?? ""}`,
  }));
  const taskIds = tasks.map((t) => t.id);

  const attachmentsByTask: Record<string, AttachmentWithUrl[]> = {};
  const commentsByTask: Record<string, CommentWithAuthor[]> = {};
  if (taskIds.length) {
    const [attsRes, cmtsRes] = await Promise.all([
      supabase
        .from("task_attachments")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("task_comments")
        .select(
          "*, author:profiles!task_comments_user_id_fkey(full_name, avatar_color)",
        )
        .in("task_id", taskIds)
        .order("created_at", { ascending: true }),
    ]);
    const list = (attsRes.data as TaskAttachment[]) ?? [];
    const signed = await Promise.all(
      list.map((a) =>
        supabase.storage
          .from("attachments")
          .createSignedUrl(a.storage_path, 3600)
          .then((r) => r.data?.signedUrl ?? null),
      ),
    );
    list.forEach((a, i) => {
      (attachmentsByTask[a.task_id] ??= []).push({ ...a, url: signed[i] });
    });
    ((cmtsRes.data as unknown as CommentWithAuthor[]) ?? []).forEach((c) => {
      (commentsByTask[c.task_id] ??= []).push(c);
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="All work across every project"
        title="Tasks"
        search="Search tasks…"
      >
        {canManage && (
          <GlobalAddTaskDialog
            projects={projectOptions.map((p) => ({
              id: p.id,
              name: p.name,
              clientName: p.client?.business_name ?? null,
            }))}
            team={assignees}
          />
        )}
      </PageHeader>
      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Work assigned to you and your projects will show up here."
        >
          {canManage && (
            <GlobalAddTaskDialog
              projects={projectOptions.map((p) => ({
                id: p.id,
                name: p.name,
                clientName: p.client?.business_name ?? null,
              }))}
              team={assignees}
            />
          )}
        </EmptyState>
      ) : (
        <TasksBoard
          tasks={tasks}
          attachmentsByTask={attachmentsByTask}
          commentsByTask={commentsByTask}
          assignees={assignees}
          currentUserId={profile.id}
          currentUserRole={profile.role}
          canManage={canManage}
        />
      )}
    </>
  );
}
