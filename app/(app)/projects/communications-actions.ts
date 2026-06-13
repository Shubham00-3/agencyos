"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  COMM_LANGUAGES,
  MAX_TRANSCRIPTION_AUDIO_BYTES,
} from "@/lib/constants";
import {
  isConfigured,
  startTranscriptionJob,
  fetchTranscriptionResult,
  summarizeTranscript,
  translateTranscriptToEnglish,
} from "@/lib/transcription/sarvam";
import type { TranscriptStatus } from "@/lib/types";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// Signed upload URL so the browser PUTs audio bytes straight to Storage
// (Server Action bodies cap at 1MB; call recordings are far larger).
export async function createCommunicationUploadUrlAction(input: {
  project_id: string;
  file_name: string;
}): Promise<{ error: string } | { path: string; token: string }> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };
  if (!input.project_id) return { error: "Missing project" };

  const safeName = input.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `communications/${input.project_id}/${Date.now()}-${safeName}`;
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUploadUrl(path);
  if (error) return { error: error.message };
  return { path: data.path, token: data.token };
}

export async function createCommunicationAction(input: {
  project_id: string;
  title?: string;
  audio_path: string;
  duration_seconds?: number | null;
  language_hint: string;
  transcribe?: boolean;
}): Promise<{ error: string } | { id: string }> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("communications")
    .insert({
      project_id: input.project_id,
      title: input.title?.trim() || null,
      audio_path: input.audio_path,
      duration_seconds: input.duration_seconds ?? null,
      language_hint: input.language_hint || "auto",
      transcript_status: input.transcribe === false ? "none" : "processing",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(`/projects/${input.project_id}`);
  return { id: data.id as string };
}

// Start a Sarvam batch job and return immediately (serverless-safe — the long
// transcription runs on Sarvam's side). Stores the job id; the client then polls
// pollCommunicationTranscriptionAction until it resolves.
export async function startCommunicationTranscriptionAction(input: {
  id: string;
  project_id: string;
}) {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };

  if (!isConfigured()) {
    await supabase
      .from("communications")
      .update({ transcript_status: "failed" })
      .eq("id", input.id);
    revalidatePath(`/projects/${input.project_id}`);
    return { error: "Transcription isn't configured (SARVAM_API_KEY missing)." };
  }

  const { data: comm } = await supabase
    .from("communications")
    .select("audio_path, language_hint")
    .eq("id", input.id)
    .single();
  if (!comm?.audio_path) return { error: "No audio to transcribe" };

  try {
    const { data: blob, error: dlErr } = await supabase.storage
      .from("attachments")
      .download(comm.audio_path);
    if (dlErr || !blob) throw new Error(dlErr?.message ?? "Could not load audio");
    if (blob.size > MAX_TRANSCRIPTION_AUDIO_BYTES) {
      await supabase
        .from("communications")
        .update({ transcript_status: "none" })
        .eq("id", input.id);
      revalidatePath(`/projects/${input.project_id}`);
      return {
        error:
          "Audio saved, but it is too large for automatic transcription. Upload a shorter recording or add the transcript manually.",
      };
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const lang =
      COMM_LANGUAGES.find((l) => l.value === comm.language_hint) ??
      COMM_LANGUAGES[0];
    const fileName = comm.audio_path.split("/").pop() ?? "audio.wav";

    const jobId = await startTranscriptionJob(bytes, {
      languageCode: lang.languageCode,
      mode: lang.mode,
      fileName,
    });

    await supabase
      .from("communications")
      .update({ transcript_job_id: jobId, transcript_status: "processing" })
      .eq("id", input.id);
    revalidatePath(`/projects/${input.project_id}`);
    return { status: "processing" as TranscriptStatus };
  } catch (e) {
    await supabase
      .from("communications")
      .update({ transcript_status: "failed" })
      .eq("id", input.id);
    revalidatePath(`/projects/${input.project_id}`);
    return { error: e instanceof Error ? e.message : "Could not start transcription" };
  }
}

// Poll a started job. While running, returns 'processing'. When Sarvam finishes,
// this single short call fetches the transcript, summarises it, and saves —
// comfortably within a serverless time limit.
export async function pollCommunicationTranscriptionAction(input: {
  id: string;
  project_id: string;
}): Promise<{ status: TranscriptStatus } | { error: string }> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };

  const { data: comm } = await supabase
    .from("communications")
    .select("transcript_job_id, transcript_status")
    .eq("id", input.id)
    .single();
  if (!comm) return { error: "Not found" };
  if (comm.transcript_status !== "processing") {
    return { status: comm.transcript_status as TranscriptStatus };
  }
  if (!comm.transcript_job_id) return { status: "processing" };

  try {
    const result = await fetchTranscriptionResult(comm.transcript_job_id);
    if (result.state === "processing") return { status: "processing" };

    if (result.state === "failed") {
      await supabase
        .from("communications")
        .update({ transcript_status: "failed" })
        .eq("id", input.id);
      revalidatePath(`/projects/${input.project_id}`);
      return { status: "failed" };
    }

    let transcript = result.transcript;
    if (transcript) {
      try {
        transcript = await translateTranscriptToEnglish(transcript);
      } catch {
        // New jobs use Saaras translate mode, but older jobs may still return
        // native-script text. If repair translation fails, still save the raw
        // transcript rather than leaving the call stuck in processing.
      }
    }

    let summary = "";
    if (transcript) {
      try {
        summary = await summarizeTranscript(transcript);
      } catch {
        // Do not keep a finished transcript stuck in "processing" just because
        // the secondary summary call failed or a chat model changed upstream.
        summary = "";
      }
    }
    await supabase
      .from("communications")
      .update({
        transcript: transcript || null,
        summary: summary || null,
        transcript_status: "done",
      })
      .eq("id", input.id);
    revalidatePath(`/projects/${input.project_id}`);
    return { status: "done" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not check status" };
  }
}

// Manual edits — correcting the transcript or summary, or naming the call.
export async function updateCommunicationAction(input: {
  id: string;
  project_id: string;
  title?: string | null;
  transcript?: string;
  summary?: string;
}) {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title?.trim() || null;
  if (input.transcript !== undefined) {
    patch.transcript = input.transcript.trim() || null;
    patch.transcript_edited = true;
  }
  if (input.summary !== undefined) patch.summary = input.summary.trim() || null;
  if (Object.keys(patch).length === 0) return {};

  const { error } = await supabase
    .from("communications")
    .update(patch)
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${input.project_id}`);
  return {};
}

export async function deleteCommunicationAction(input: {
  id: string;
  project_id: string;
  audio_path: string | null;
}) {
  const { supabase, user } = await authed();
  if (!user) return { error: "Not authenticated" };

  if (input.audio_path) {
    await supabase.storage.from("attachments").remove([input.audio_path]);
  }
  const { error } = await supabase
    .from("communications")
    .delete()
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${input.project_id}`);
  return {};
}
