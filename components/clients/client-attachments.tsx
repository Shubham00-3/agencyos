"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Trash2, Paperclip, Download } from "lucide-react";
import { toast } from "sonner";
import {
  createClientUploadUrlAction,
  recordClientAttachmentAction,
  deleteClientAttachmentAction,
} from "@/app/(app)/clients/actions";
import { createClient } from "@/lib/supabase/client";
import { formatBytes, formatDate } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ClientAttachmentItem = {
  id: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  created_at: string;
  url: string | null;
};

export function ClientAttachments({
  clientId,
  attachments,
  canManage = false,
}: {
  clientId: string;
  attachments: ClientAttachmentItem[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    for (const file of Array.from(files)) {
      const signed = await createClientUploadUrlAction({
        client_id: clientId,
        file_name: file.name,
      });
      if ("error" in signed) {
        toast.error(`${file.name}: ${signed.error}`);
        continue;
      }

      const { error: upErr } = await supabase.storage
        .from("attachments")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type || undefined,
        });
      if (upErr) {
        toast.error(`${file.name}: ${upErr.message}`);
        continue;
      }

      const res = await recordClientAttachmentAction({
        client_id: clientId,
        storage_path: signed.path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
      });
      if (res.error) toast.error(`${file.name}: ${res.error}`);
      else toast.success(`Uploaded ${file.name}`);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function onDelete(id: string, storagePath: string) {
    const res = await deleteClientAttachmentAction({
      id,
      storage_path: storagePath,
      client_id: clientId,
    });
    if (res.error) return toast.error(res.error);
    toast.success("Attachment removed");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="size-4 text-muted-foreground" />
          Attachments
        </CardTitle>
        {canManage && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              aria-label="Upload any file type"
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload
            </Button>
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files attached yet.</p>
        ) : (
          attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border p-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(a.file_size)}
                  {a.file_size ? " · " : ""}
                  {formatDate(a.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    aria-label={`Download ${a.file_name}`}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "size-7",
                    )}
                  >
                    <Download className="size-3.5" />
                  </a>
                )}
                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(a.id, a.storage_path)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
