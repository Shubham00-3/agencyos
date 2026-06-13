"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { WEBSITE_WORKFLOW } from "@/lib/constants";
import type {
  LifecycleKind,
  ProjectStatus,
  TaskCategory,
  TaskStatus,
} from "@/lib/types";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function ensureProjectMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  userId?: string | null,
) {
  if (!userId) return null;
  const { error } = await supabase.from("project_members").upsert(
    {
      project_id: projectId,
      user_id: userId,
    },
    { onConflict: "project_id,user_id" },
  );
  return error;
}

export async function createProjectAction(input: {
  client_id: string;
  name: string;
  project_type?: string | null;
  project_kind?: LifecycleKind;
  description?: string;
}) {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };
  const { data, error } = await supabase
    .from("projects")
    .insert({
      client_id: input.client_id,
      name: input.name,
      project_type: input.project_type || null,
      project_kind: input.project_kind ?? "new",
      description: input.description || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/projects");
  return { id: data.id as string };
}

// Seed the fixed website pipeline as one assignable task per stage. Idempotent
// per stage: re-running only adds stages that are missing, so existing tasks
// (and their assignees/progress) are never duplicated or clobbered.
export async function generateWorkflowAction(input: { project_id: string }) {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };

  const { data: existing, error: exErr } = await supabase
    .from("tasks")
    .select("stage")
    .eq("project_id", input.project_id)
    .not("stage", "is", null);
  if (exErr) return { error: exErr.message };

  const present = new Set(
    (existing as { stage: string | null }[]).map((t) => t.stage),
  );
  const rows = WEBSITE_WORKFLOW.map((step, i) => ({ ...step, order: i }))
    .filter((step) => !present.has(step.stage))
    .map((step) => ({
      project_id: input.project_id,
      title: step.stage,
      description: step.description,
      category: step.category,
      stage: step.stage,
      step_order: step.order,
      status: "todo" as TaskStatus,
      created_by: user.id,
    }));

  if (rows.length === 0) return { added: 0 };

  const { error } = await supabase.from("tasks").insert(rows);
  if (error) {
    if (error.code === "23505") {
      revalidatePath(`/projects/${input.project_id}`);
      revalidatePath("/tasks");
      return { added: 0 };
    }
    return { error: error.message };
  }

  revalidatePath(`/projects/${input.project_id}`);
  revalidatePath("/tasks");
  return { added: rows.length };
}

export async function createTaskAction(input: {
  project_id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  assignee_id?: string | null;
  due_date?: string | null;
}) {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("tasks").insert({
    project_id: input.project_id,
    title: input.title,
    description: input.description || null,
    category: input.category,
    assignee_id: input.assignee_id || null,
    due_date: input.due_date || null,
    created_by: user.id,
  });
  if (error) return { error: error.message };
  const memberError = await ensureProjectMember(
    supabase,
    input.project_id,
    input.assignee_id,
  );
  if (memberError) return { error: memberError.message };
  revalidatePath(`/projects/${input.project_id}`);
  return {};
}

export async function updateTaskAction(input: {
  task_id: string;
  project_id: string;
  title: string;
  description?: string | null;
  category: TaskCategory;
  assignee_id?: string | null;
  due_date?: string | null;
}) {
  const { supabase } = await authed();
  const { error } = await supabase
    .from("tasks")
    .update({
      title: input.title,
      description: input.description || null,
      category: input.category,
      assignee_id: input.assignee_id || null,
      due_date: input.due_date || null,
    })
    .eq("id", input.task_id);
  if (error) return { error: error.message };
  const memberError = await ensureProjectMember(
    supabase,
    input.project_id,
    input.assignee_id,
  );
  if (memberError) return { error: memberError.message };
  revalidatePath(`/projects/${input.project_id}`);
  revalidatePath("/tasks");
  return {};
}

export async function updateProjectAction(input: {
  project_id: string;
  name: string;
  project_type?: string | null;
  project_kind?: LifecycleKind;
  description?: string | null;
  brief?: Record<string, string> | null;
}) {
  const { supabase } = await authed();
  const { error } = await supabase
    .from("projects")
    .update({
      name: input.name,
      project_type: input.project_type || null,
      project_kind: input.project_kind ?? "new",
      description: input.description || null,
      brief: input.brief ?? null,
    })
    .eq("id", input.project_id);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${input.project_id}`);
  revalidatePath("/projects");
  return {};
}

export async function updateTaskStatusAction(input: {
  task_id: string;
  project_id: string;
  status: TaskStatus;
}) {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };

  if (input.status === "in_progress") {
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("status")
      .eq("id", input.task_id)
      .single();
    if (taskError) return { error: taskError.message };

    if (task?.status === "todo") {
      const [attachmentsRes, commentsRes] = await Promise.all([
        supabase
          .from("task_attachments")
          .select("id", { count: "exact", head: true })
          .eq("task_id", input.task_id),
        supabase
          .from("task_comments")
          .select("id", { count: "exact", head: true })
          .eq("task_id", input.task_id),
      ]);
      if (attachmentsRes.error) return { error: attachmentsRes.error.message };
      if (commentsRes.error) return { error: commentsRes.error.message };

      const evidenceCount =
        (attachmentsRes.count ?? 0) + (commentsRes.count ?? 0);
      if (evidenceCount === 0) {
        return {
          error:
            "Add a comment or upload a file before moving this task to in progress.",
        };
      }
    }
  }

  // A change request only applies while the task is being reworked. Moving the
  // task to any other state (e.g. resubmitting for review) clears it.
  const patch: { status: TaskStatus; change_request?: null } = {
    status: input.status,
  };
  if (input.status !== "in_progress") patch.change_request = null;
  const { error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", input.task_id);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${input.project_id}`);
  revalidatePath("/tasks");
  return {};
}

// Reviewer sends a task back to "in progress" with a note describing the
// changes needed. The note is stored on the task (shown as a banner to the
// worker) and also logged in the discussion for history.
export async function requestTaskChangesAction(input: {
  task_id: string;
  project_id: string;
  note: string;
}) {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };
  const note = input.note.trim();
  if (!note) return { error: "Describe the changes needed" };

  const { error } = await supabase
    .from("tasks")
    .update({ status: "in_progress", change_request: note })
    .eq("id", input.task_id);
  if (error) return { error: error.message };

  await supabase.from("task_comments").insert({
    task_id: input.task_id,
    user_id: user.id,
    body: `Requested changes: ${note}`,
  });

  revalidatePath(`/projects/${input.project_id}`);
  revalidatePath("/tasks");
  return {};
}

export async function addCommentAction(input: {
  task_id: string;
  project_id: string;
  body: string;
}) {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("task_comments").insert({
    task_id: input.task_id,
    user_id: user.id,
    body: input.body,
  });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${input.project_id}`);
  return {};
}

// Mint a short-lived signed URL so the browser can upload the file bytes
// directly to Supabase Storage. This avoids routing large files through the
// Server Action body (capped at 1MB by Next.js).
export async function createUploadUrlAction(input: {
  task_id: string;
  project_id: string;
  file_name: string;
}): Promise<{ error: string } | { path: string; token: string }> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };
  if (!input.task_id) return { error: "Missing task" };

  const safeName = input.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${input.project_id}/${input.task_id}/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUploadUrl(path);
  if (error) return { error: error.message };

  return { path: data.path, token: data.token };
}

// Record the attachment row after the browser has uploaded the bytes directly
// to storage via the signed URL.
export async function recordAttachmentAction(input: {
  task_id: string;
  project_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
}) {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("task_attachments").insert({
    task_id: input.task_id,
    file_name: input.file_name,
    storage_path: input.storage_path,
    file_size: input.file_size,
    mime_type: input.mime_type,
    uploaded_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/projects/${input.project_id}`);
  return {};
}

export async function deleteAttachmentAction(input: {
  id: string;
  storage_path: string;
  project_id: string;
}) {
  const { supabase } = await authed();
  await supabase.storage.from("attachments").remove([input.storage_path]);
  const { error } = await supabase
    .from("task_attachments")
    .delete()
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${input.project_id}`);
  return {};
}

export async function setProjectStatusAction(input: {
  project_id: string;
  status: ProjectStatus;
}) {
  const { supabase } = await authed();
  const { error } = await supabase
    .from("projects")
    .update({ status: input.status })
    .eq("id", input.project_id);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${input.project_id}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return {};
}

export async function setProjectMembersAction(input: {
  project_id: string;
  user_ids: string[];
}) {
  const { supabase } = await authed();
  // Replace the membership set with the provided list.
  const { error: delErr } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", input.project_id);
  if (delErr) return { error: delErr.message };

  if (input.user_ids.length) {
    const { error } = await supabase.from("project_members").insert(
      input.user_ids.map((uid) => ({
        project_id: input.project_id,
        user_id: uid,
      })),
    );
    if (error) return { error: error.message };
  }
  revalidatePath(`/projects/${input.project_id}`);
  return {};
}
