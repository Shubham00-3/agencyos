"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus, TaskCategory, TaskStatus } from "@/lib/types";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createProjectAction(input: {
  client_id: string;
  name: string;
  description?: string;
}) {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };
  const { data, error } = await supabase
    .from("projects")
    .insert({
      client_id: input.client_id,
      name: input.name,
      description: input.description || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/projects");
  return { id: data.id as string };
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
  revalidatePath(`/projects/${input.project_id}`);
  return {};
}

export async function updateTaskStatusAction(input: {
  task_id: string;
  project_id: string;
  status: TaskStatus;
}) {
  const { supabase } = await authed();
  const { error } = await supabase
    .from("tasks")
    .update({ status: input.status })
    .eq("id", input.task_id);
  if (error) return { error: error.message };
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

export async function uploadAttachmentAction(formData: FormData) {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  const taskId = formData.get("task_id") as string;
  const projectId = formData.get("project_id") as string;
  if (!file || !taskId) return { error: "Missing file" };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${projectId}/${taskId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("attachments")
    .upload(path, file, { contentType: file.type || undefined });
  if (upErr) return { error: upErr.message };

  const { error } = await supabase.from("task_attachments").insert({
    task_id: taskId,
    file_name: file.name,
    storage_path: path,
    file_size: file.size,
    mime_type: file.type || null,
    uploaded_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}`);
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
