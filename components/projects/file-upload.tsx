"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadAttachmentAction } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";

export function FileUpload({
  taskId,
  projectId,
  buttonId,
}: {
  taskId: string;
  projectId: string;
  buttonId?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("task_id", taskId);
      fd.set("project_id", projectId);
      const res = await uploadAttachmentAction(fd);
      if (res.error) {
        toast.error(`${file.name}: ${res.error}`);
      } else {
        toast.success(`Uploaded ${file.name}`);
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
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
        id={buttonId}
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
        Upload any file
      </Button>
    </>
  );
}
