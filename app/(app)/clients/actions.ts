"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CredentialKind } from "@/lib/types";

export type CredentialInput = {
  kind: CredentialKind;
  label: string;
  url?: string;
  username?: string;
  password?: string;
  notes?: string;
};

export type NewClientInput = {
  business_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  existing_website_url?: string;
  notes?: string;
  credentials?: CredentialInput[];
};

export async function createClientAction(input: NewClientInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      business_name: input.business_name,
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
    contact_name?: string;
    phone?: string;
    email?: string;
    existing_website_url?: string;
    status: "active" | "completed";
    notes?: string;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      business_name: input.business_name,
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
    kind: cred.kind,
    label: cred.label,
    url: cred.url || null,
    username: cred.username || null,
    password: cred.password || null,
    notes: cred.notes || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

export async function deleteCredentialAction(id: string, clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_credentials")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}
