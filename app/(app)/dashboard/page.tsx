import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { getProjectsMeta } from "@/lib/projects";
import { isOverdue, relativeTime } from "@/lib/format";
import { PROJECT_STATUS, TASK_STATUS } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import {
  DashboardView,
  type ActivityItem,
  type WeekItem,
} from "@/components/views/dashboard-view";
import type { ProjectStatus } from "@/lib/types";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const canManage = can.manageProjects(profile.role);
  const firstName = profile.full_name.split(" ")[0];

  const projects = await getProjectsMeta(supabase);

  const [clientsRes, tasksRes, actsRes] = await Promise.all([
    supabase.from("clients").select("id, business_name, status"),
    supabase
      .from("tasks")
      .select(
        "title, status, due_date, assignee:profiles!tasks_assignee_id_fkey(full_name), project:projects(name)",
      ),
    canManage
      ? supabase
          .from("activity_log")
          .select(
            "action, entity_type, meta, created_at, actor:profiles!activity_log_actor_id_fkey(full_name, avatar_color)",
          )
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
  ]);

  const clients =
    (clientsRes.data as { id: string; business_name: string; status: string }[]) ??
    [];
  const tasks =
    (tasksRes.data as unknown as {
      title: string;
      status: string;
      due_date: string | null;
      assignee: { full_name: string } | null;
      project: { name: string } | null;
    }[]) ?? [];

  const kpis = {
    activeClients: clients.filter((c) => c.status === "active").length,
    inProgress: projects.filter((p) => p.status === "in_progress").length,
    inReview: projects.filter((p) => p.status === "in_review").length,
    overdue: tasks.filter((t) => t.status !== "done" && isOverdue(t.due_date))
      .length,
  };

  const week: WeekItem[] = tasks
    .filter((t) => t.status !== "done" && t.due_date)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 4)
    .map((t) => ({
      day: new Date(t.due_date!).toLocaleDateString("en-CA", {
        weekday: "short",
      }),
      pip: isOverdue(t.due_date) ? "var(--red)" : "var(--amber)",
      title: t.title,
      who:
        [t.project?.name, t.assignee?.full_name].filter(Boolean).join(" · ") ||
        "Unassigned",
    }));

  const acts =
    (actsRes.data as unknown as {
      entity_type: string;
      meta: { to?: string; title?: string; name?: string } | null;
      created_at: string;
      actor: { full_name: string; avatar_color: string } | null;
    }[]) ?? [];

  const activity: ActivityItem[] = acts.map((a) => {
    const what = a.meta?.title || a.meta?.name || "an item";
    const toLabel =
      a.entity_type === "project"
        ? PROJECT_STATUS[a.meta?.to as ProjectStatus]?.label
        : TASK_STATUS[a.meta?.to as keyof typeof TASK_STATUS]?.label;
    return {
      name: a.actor?.full_name ?? "Someone",
      color: a.actor?.avatar_color ?? "#5a57e0",
      text: `moved ${what}${toLabel ? ` to ${toLabel}` : ""}`,
      when: relativeTime(a.created_at),
    };
  });

  return (
    <>
      <PageHeader
        eyebrow={`${projects.length} projects · ${kpis.activeClients} active clients`}
        title={`Studio board`}
        search="Search projects, clients…"
      >
        {canManage && (
          <NewProjectDialog
            clients={clients.map((c) => ({
              id: c.id,
              business_name: c.business_name,
            }))}
          />
        )}
      </PageHeader>

      <p className="muted-sm" style={{ marginTop: -16, marginBottom: 20 }}>
        Welcome back, {firstName}
      </p>

      <DashboardView
        projects={projects}
        kpis={kpis}
        week={week}
        activity={activity}
        canManage={canManage}
        clients={clients.map((c) => ({
          id: c.id,
          business_name: c.business_name,
        }))}
      />
    </>
  );
}
