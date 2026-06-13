"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  Square,
  Upload,
  Loader2,
  Trash2,
  Pencil,
  RefreshCw,
  MessageSquareText,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { WavRecorder } from "@/lib/audio/wav-recorder";
import {
  COMM_LANGUAGES,
  COMM_LANGUAGE_LABEL,
  MAX_TRANSCRIPTION_AUDIO_BYTES,
  TRANSCRIPT_STATUS_LABEL,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { TranscriptStatus } from "@/lib/types";
import {
  createCommunicationUploadUrlAction,
  createCommunicationAction,
  startCommunicationTranscriptionAction,
  pollCommunicationTranscriptionAction,
  updateCommunicationAction,
  deleteCommunicationAction,
} from "@/app/(app)/projects/communications-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type CommunicationItem = {
  id: string;
  title: string | null;
  audio_url: string | null;
  audio_path: string | null;
  duration_seconds: number | null;
  language_hint: string;
  transcript: string | null;
  transcript_edited: boolean;
  transcript_status: TranscriptStatus;
  summary: string | null;
  occurred_at: string;
};

function StatusBadge({ status }: { status: TranscriptStatus }) {
  const cls =
    status === "done"
      ? "b-live"
      : status === "processing"
        ? "b-prog"
        : status === "failed"
          ? "b-rev"
          : "b-todo";
  return <span className={"badge " + cls}>{TRANSCRIPT_STATUS_LABEL[status]}</span>;
}

export function CommunicationsPanel({
  projectId,
  communications,
  canManage = false,
}: {
  projectId: string;
  communications: CommunicationItem[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<WavRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollErrorIdsRef = useRef<Set<string>>(new Set());

  const [language, setLanguage] = useState("auto");
  const [title, setTitle] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState<string | null>(null); // status text while working

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // While any recording is still transcribing, poll Sarvam until it resolves.
  // This is what makes it serverless-safe: each poll is a short request, and the
  // long job runs on Sarvam's side. Reopening the page also resumes polling.
  const processingKey = communications
    .filter((c) => c.transcript_status === "processing")
    .map((c) => c.id)
    .join(",");
  useEffect(() => {
    const ids = processingKey ? processingKey.split(",") : [];
    if (ids.length === 0) return;
    let active = true;
    const interval = setInterval(async () => {
      let changed = false;
      for (const id of ids) {
        const res = await pollCommunicationTranscriptionAction({
          id,
          project_id: projectId,
        });
        if ("error" in res) {
          if (!pollErrorIdsRef.current.has(id)) {
            toast.error(res.error);
            pollErrorIdsRef.current.add(id);
          }
          continue;
        }
        pollErrorIdsRef.current.delete(id);
        if (res.status !== "processing") changed = true;
      }
      if (changed && active) router.refresh();
    }, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [processingKey, projectId, router]);

  // Shared pipeline: push bytes to Storage, create the row, kick off Sarvam.
  async function ingest(blob: Blob, fileName: string, duration: number | null) {
    setBusy("Uploading…");
    const supabase = createClient();
    const shouldTranscribe = blob.size <= MAX_TRANSCRIPTION_AUDIO_BYTES;
    const signed = await createCommunicationUploadUrlAction({
      project_id: projectId,
      file_name: fileName,
    });
    if ("error" in signed) {
      setBusy(null);
      return toast.error(signed.error);
    }
    const { error: upErr } = await supabase.storage
      .from("attachments")
      .uploadToSignedUrl(signed.path, signed.token, blob, {
        contentType: blob.type || "audio/wav",
      });
    if (upErr) {
      setBusy(null);
      return toast.error(upErr.message);
    }

    const created = await createCommunicationAction({
      project_id: projectId,
      title: title || undefined,
      audio_path: signed.path,
      duration_seconds: duration,
      language_hint: language,
      transcribe: shouldTranscribe,
    });
    if ("error" in created) {
      setBusy(null);
      return toast.error(created.error);
    }

    setTitle("");
    setBusy(null);
    if (!shouldTranscribe) {
      toast.warning(
        "Saved. This audio is too large for auto-transcription; add the transcript manually.",
      );
      router.refresh();
      return;
    }
    const res = await startCommunicationTranscriptionAction({
      id: created.id,
      project_id: projectId,
    });
    if ("error" in res) toast.error(res.error);
    else toast.success("Saved — transcribing in the background");
    router.refresh();
  }

  async function startRecording() {
    try {
      const rec = new WavRecorder();
      await rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      toast.error("Couldn't access the microphone");
    }
  }

  async function stopRecording() {
    const rec = recorderRef.current;
    if (!rec) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    const { blob, durationSeconds } = rec.stop();
    recorderRef.current = null;
    await ingest(blob, `call-${Date.now()}.wav`, durationSeconds);
  }

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    await ingest(file, file.name, null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareText className="size-4 text-muted-foreground" />
          Communication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
            <div className="min-w-40 flex-1 space-y-1.5">
              <Label htmlFor="comm-title">Title (optional)</Label>
              <Input
                id="comm-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Kickoff call"
                disabled={recording || !!busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Spoken language</Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v ?? "auto")}
                items={COMM_LANGUAGE_LABEL}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMM_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {recording ? (
                <Button type="button" variant="destructive" onClick={stopRecording}>
                  <Square className="size-4" />
                  Stop ({elapsed}s)
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={startRecording}
                  disabled={!!busy}
                >
                  <Mic className="size-4" />
                  Record
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={recording || !!busy}
              >
                <Upload className="size-4" />
                Upload
              </Button>
            </div>
          </div>
        )}

        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {busy}
          </p>
        )}

        {communications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No calls recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {communications.map((c) => (
              <CommunicationRow
                key={c.id}
                projectId={projectId}
                comm={c}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommunicationRow({
  projectId,
  comm,
  canManage,
}: {
  projectId: string;
  comm: CommunicationItem;
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<null | "transcript" | "summary">(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);

  function beginEdit(field: "transcript" | "summary") {
    setDraft((field === "transcript" ? comm.transcript : comm.summary) ?? "");
    setEditing(field);
  }

  async function save() {
    setSaving(true);
    const res = await updateCommunicationAction({
      id: comm.id,
      project_id: projectId,
      ...(editing === "transcript"
        ? { transcript: draft }
        : { summary: draft }),
    });
    setSaving(false);
    if (res.error) return toast.error(res.error);
    setEditing(null);
    toast.success("Saved");
    router.refresh();
  }

  async function retry() {
    setRetrying(true);
    const res = await startCommunicationTranscriptionAction({
      id: comm.id,
      project_id: projectId,
    });
    setRetrying(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Transcribing in the background");
    router.refresh();
  }

  async function remove() {
    const res = await deleteCommunicationAction({
      id: comm.id,
      project_id: projectId,
      audio_path: comm.audio_path,
    });
    if (res.error) return toast.error(res.error);
    toast.success("Removed");
    router.refresh();
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {comm.title || "Untitled call"}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(comm.occurred_at)} · {COMM_LANGUAGE_LABEL[comm.language_hint] ?? comm.language_hint}
            {comm.duration_seconds ? ` · ${comm.duration_seconds}s` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge status={comm.transcript_status} />
          {canManage && (
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={remove}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {comm.audio_url && (
        <audio controls preload="none" src={comm.audio_url} className="mb-2 w-full" />
      )}

      {canManage && comm.transcript_status === "failed" && (
        <Button
          size="sm"
          variant="outline"
          onClick={retry}
          disabled={retrying}
          className="mb-2"
        >
          {retrying ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Retry transcription
        </Button>
      )}

      {/* Summary */}
      <Section
        label="Summary"
        value={comm.summary}
        editing={editing === "summary"}
        canManage={canManage}
        draft={draft}
        setDraft={setDraft}
        onEdit={() => beginEdit("summary")}
        onSave={save}
        onCancel={() => setEditing(null)}
        saving={saving}
        placeholder="No summary yet."
      />

      {/* Transcript */}
      <Section
        label={comm.transcript_edited ? "Transcript (edited)" : "Transcript"}
        value={comm.transcript}
        editing={editing === "transcript"}
        canManage={canManage}
        draft={draft}
        setDraft={setDraft}
        onEdit={() => beginEdit("transcript")}
        onSave={save}
        onCancel={() => setEditing(null)}
        saving={saving}
        placeholder={
          comm.transcript_status === "processing"
            ? "Transcribing…"
            : "No transcript yet."
        }
        mono
      />
    </div>
  );
}

function Section({
  label,
  value,
  editing,
  canManage,
  draft,
  setDraft,
  onEdit,
  onSave,
  onCancel,
  saving,
  placeholder,
  mono,
}: {
  label: string;
  value: string | null;
  editing: boolean;
  canManage: boolean;
  draft: string;
  setDraft: (v: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  placeholder: string;
  mono?: boolean;
}) {
  return (
    <div className="mt-2 border-t pt-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {canManage && !editing && (
          <Button size="icon" variant="ghost" className="size-6" onClick={onEdit}>
            <Pencil className="size-3" />
          </Button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={mono ? 6 : 3}
            className={mono ? "font-mono text-xs" : undefined}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : value ? (
        <p
          className={
            "whitespace-pre-wrap text-sm text-foreground/90" +
            (mono ? " font-mono text-xs" : "")
          }
        >
          {value}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{placeholder}</p>
      )}
    </div>
  );
}
