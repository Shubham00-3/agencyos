"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_WEB_ARCHIVE_LINKS } from "@/lib/constants";
import type { CredentialKind, LifecycleKind } from "@/lib/types";

export type CredentialInput = {
  kind: CredentialKind;
  label: string;
  url?: string;
  username?: string;
  password?: string;
  notes?: string;
  project_id?: string;
};

export type NewClientInput = {
  business_name: string;
  city: string;
  province?: string;
  country?: string;
  client_kind?: LifecycleKind;
  web_archive_links?: string[];
  last_website_notes?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  existing_website_url?: string;
  notes?: string;
  credentials?: CredentialInput[];
};

// Trim, drop blanks, and cap at the allowed number of archive links.
function cleanLinks(links?: string[]): string[] {
  return (links ?? [])
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_WEB_ARCHIVE_LINKS);
}

export async function createClientAction(input: NewClientInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!input.business_name?.trim()) return { error: "Business name is required" };
  if (!input.city?.trim()) return { error: "City is required" };

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      business_name: input.business_name,
      city: input.city,
      province: input.province || null,
      country: input.country || null,
      client_kind: input.client_kind ?? "new",
      web_archive_links: cleanLinks(input.web_archive_links),
      last_website_notes: input.last_website_notes || null,
      contact_name: input.contact_name || null,
      phone: input.phone || null,
      email: input.email || null,
      existing_website_url: input.existing_website_url || null,
      notes: input.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const creds = (input.credentials ?? []).filter((c) => c.label?.trim());
  if (creds.length) {
    const { error: credErr } = await supabase.from("client_credentials").insert(
      creds.map((c) => ({
        client_id: client.id,
        project_id: c.project_id || null,
        kind: c.kind,
        label: c.label,
        url: c.url || null,
        username: c.username || null,
        password: c.password || null,
        notes: c.notes || null,
      })),
    );
    if (credErr) return { error: credErr.message };
  }

  revalidatePath("/clients");
  return { id: client.id as string };
}

export async function updateClientAction(
  id: string,
  input: {
    business_name: string;
    city: string;
    province?: string;
    country?: string;
    client_kind?: LifecycleKind;
    web_archive_links?: string[];
    last_website_notes?: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    existing_website_url?: string;
    status: "active" | "completed";
    notes?: string;
  },
) {
  const supabase = await createClient();
  if (!input.business_name?.trim()) return { error: "Business name is required" };
  if (!input.city?.trim()) return { error: "City is required" };
  const { error } = await supabase
    .from("clients")
    .update({
      business_name: input.business_name,
      city: input.city,
      province: input.province || null,
      country: input.country || null,
      client_kind: input.client_kind ?? "new",
      web_archive_links: cleanLinks(input.web_archive_links),
      last_website_notes: input.last_website_notes || null,
      contact_name: input.contact_name || null,
      phone: input.phone || null,
      email: input.email || null,
      existing_website_url: input.existing_website_url || null,
      status: input.status,
      notes: input.notes || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return {};
}

export async function addCredentialAction(
  clientId: string,
  cred: CredentialInput,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_credentials").insert({
    client_id: clientId,
    project_id: cred.project_id || null,
    kind: cred.kind,
    label: cred.label,
    url: cred.url || null,
    username: cred.username || null,
    password: cred.password || null,
    notes: cred.notes || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  if (cred.project_id) revalidatePath(`/projects/${cred.project_id}`);
  return {};
}

// ---- Client attachments --------------------------------------------------
// Mirror the task-attachment flow: mint a short-lived signed upload URL so the
// browser uploads file bytes straight to Storage (Server Action bodies cap at
// 1MB), then record the row.

export async function createClientUploadUrlAction(input: {
  client_id: string;
  file_name: string;
}): Promise<{ error: string } | { path: string; token: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!input.client_id) return { error: "Missing client" };

  const safeName = input.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `clients/${input.client_id}/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUploadUrl(path);
  if (error) return { error: error.message };
  return { path: data.path, token: data.token };
}

export async function recordClientAttachmentAction(input: {
  client_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("client_attachments").insert({
    client_id: input.client_id,
    file_name: input.file_name,
    storage_path: input.storage_path,
    file_size: input.file_size,
    mime_type: input.mime_type,
    uploaded_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(`/clients/${input.client_id}`);
  return {};
}

export async function deleteClientAttachmentAction(input: {
  id: string;
  storage_path: string;
  client_id: string;
}) {
  const supabase = await createClient();
  await supabase.storage.from("attachments").remove([input.storage_path]);
  const { error } = await supabase
    .from("client_attachments")
    .delete()
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${input.client_id}`);
  return {};
}

export async function deleteCredentialAction(
  id: string,
  clientId: string,
  projectId?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_credentials")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  if (projectId) revalidatePath(`/projects/${projectId}`);
  return {};
}
