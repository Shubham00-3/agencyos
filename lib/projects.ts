import type { SupabaseClient } from "@supabase/supabase-js";
import type { LifecycleKind, ProjectStatus } from "./types";
import { isOverdue } from "./format";

export type ProjectMeta = {
  id: string;
  name: string;
  project_type: string | null;
  project_kind: LifecycleKind;
  description: string | null;
  status: ProjectStatus;
  client: { id: string; business_name: string } | null;
  progress: number;
  taskTotal: number;
  taskOpen: number;
  due: string;
  dueOver: boolean;
  team: { name: string; color: string }[];
  updatedSort: string;
};

function shortDue(date: string): string {
  return new Date(date).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

// Aggregates progress / next-due / team for projects the user can see.
export async function getProjectsMeta(
  supabase: SupabaseClient,
  opts: { clientId?: string } = {},
): Promise<ProjectMeta[]> {
  let pq = supabase
    .from("projects")
    .select("id, name, project_type, project_kind, description, status, created_at, client:clients(id, business_name)")
    .order("created_at", { ascending: false });
  if (opts.clientId) pq = pq.eq("client_id", opts.clientId);

  const [projRes, memRes, taskRes] = await Promise.all([
    pq,
    supabase
      .from("project_members")
      .select("project_id, user:profiles!project_members_user_id_fkey(full_name, avatar_color)"),
    supabase.from("tasks").select("project_id, status, due_date"),
  ]);

  const projects = (projRes.data as unknown as {
    id: string;
    name: string;
    project_type: string | null;
    project_kind: LifecycleKind;
    description: string | null;
    status: ProjectStatus;
    created_at: string;
    client: { id: string; business_name: string } | null;
  }[]) ?? [];

  const members = (memRes.data as unknown as {
    project_id: string;
    user: { full_name: string; avatar_color: string } | null;
  }[]) ?? [];

  const tasks = (taskRes.data as unknown as {
    project_id: string;
    status: string;
    due_date: string | null;
  }[]) ?? [];

  return projects.map((p) => {
    const pTasks = tasks.filter((t) => t.project_id === p.id);
    const done = pTasks.filter((t) => t.status === "done").length;
    const progress =
      p.status === "live"
        ? 100
        : pTasks.length
          ? Math.round((done / pTasks.length) * 100)
          : 0;

    const openDue = pTasks
      .filter((t) => t.status !== "done" && t.due_date)
      .map((t) => t.due_date as string)
      .sort();
    const next = openDue[0];

    let due = "—";
    let dueOver = false;
    if (p.status === "live") due = "Live";
    else if (next) {
      due = shortDue(next);
      dueOver = isOverdue(next);
    }

    const team = members
      .filter((m) => m.project_id === p.id && m.user)
      .map((m) => ({
        name: m.user!.full_name,
        color: m.user!.avatar_color,
      }));

    return {
      id: p.id,
      name: p.name,
      project_type: p.project_type,
      project_kind: p.project_kind,
      description: p.description,
      status: p.status,
      client: p.client,
      progress,
      taskTotal: pTasks.length,
      taskOpen: pTasks.filter((t) => t.status !== "done").length,
      due: dueOver ? "Overdue" : due,
      dueOver,
      team,
      updatedSort: p.created_at,
    };
  });
}
