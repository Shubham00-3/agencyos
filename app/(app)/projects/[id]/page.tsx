import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { isOverdue } from "@/lib/format";
import type {
  Profile,
  Project,
  ProjectStatus,
  Task,
  TaskAttachment,
  TaskComment,
} from "@/lib/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProjectDetailView } from "@/components/projects/project-detail-view";

export type AttachmentWithUrl = TaskAttachment & { url: string | null };
export type CommentWithAuthor = TaskComment & {
  author: Pick<Profile, "full_name" | "avatar_color"> | null;
};
export type TaskWithAssignee = Task & {
  assignee: Pick<Profile, "id" | "full_name" | "avatar_color"> | null;
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();
  const isStaffUser = can.manageProjects(profile.role);

  const [projectRes, tasksRes, memberRes, teamRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*, client:clients(id, business_name, status)")
      .eq("id", id)
      .single(),
    supabase
      .from("tasks")
      .select(
        "*, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_color)",
      )
      .eq("project_id", id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("project_members")
      .select("user:profiles!project_members_user_id_fkey(*)")
      .eq("project_id", id),
    isStaffUser
      ? supabase.from("profiles").select("*").order("full_name")
      : Promise.resolve({ data: null }),
  ]);

  if (!projectRes.data) notFound();
  const project = projectRes.data as Project & {
    client: { id: string; business_name: string; status: string } | null;
  };
  const tasks = (tasksRes.data as unknown as TaskWithAssignee[]) ?? [];
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

  const members =
    (memberRes.data as unknown as { user: Profile }[] | null)?.map(
      (m) => m.user,
    ) ?? [];
  const team: Profile[] = (teamRes.data as Profile[] | null) ?? members;

  // Derived meta
  const done = tasks.filter((t) => t.status === "done").length;
  const progress =
    project.status === "live"
      ? 100
      : tasks.length
        ? Math.round((done / tasks.length) * 100)
        : 0;
  const nextDue = tasks
    .filter((t) => t.status !== "done" && t.due_date)
    .map((t) => t.due_date as string)
    .sort()[0];
  const dueOver = !!nextDue && isOverdue(nextDue);
  const dueLabel =
    project.status === "live"
      ? "Live"
      : dueOver
        ? "Overdue"
        : nextDue
          ? new Date(nextDue).toLocaleDateString("en-CA", {
              month: "short",
              day: "numeric",
            })
          : "—";

  const meta = {
    progress,
    due: dueLabel,
    dueOver,
    taskTotal: tasks.length,
    taskOpen: tasks.filter((t) => t.status !== "done").length,
    team: members.map((m) => ({ name: m.full_name, color: m.avatar_color })),
  };

  return (
    <div className="detail-top">
      <div className="detail-util">
        <ThemeToggle />
      </div>
      <ProjectDetailView
        project={{
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status as ProjectStatus,
          brief: project.brief,
          client: project.client
            ? { id: project.client.id, business_name: project.client.business_name }
            : null,
        }}
        meta={meta}
        tasks={tasks}
        attachmentsByTask={attachmentsByTask}
        commentsByTask={commentsByTask}
        team={team}
        memberIds={members.map((m) => m.id)}
        currentUserId={profile.id}
        canManage={isStaffUser}
        canMarkLive={can.markLive(profile.role)}
      />
    </div>
  );
}
