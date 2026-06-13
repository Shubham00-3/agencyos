"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LIFECYCLE_LABEL,
  MAX_WEB_ARCHIVE_LINKS,
} from "@/lib/constants";
import type { LifecycleKind } from "@/lib/types";

const KINDS: LifecycleKind[] = ["new", "old"];

// Segmented New / Old toggle, reused by clients and projects.
export function LifecycleToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LifecycleKind;
  onChange: (v: LifecycleKind) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="chips">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className={"chip" + (value === k ? " on" : "")}
            onClick={() => onChange(k)}
          >
            {LIFECYCLE_LABEL[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

// Up-to-5 web-archive links for the client's old website. Always renders at
// least one row so there's somewhere to type.
export function WebArchiveLinksInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const rows = value.length ? value : [""];

  function setAt(i: number, v: string) {
    const next = rows.slice();
    next[i] = v;
    onChange(next);
  }
  function removeAt(i: number) {
    const next = rows.filter((_, idx) => idx !== i);
    onChange(next.length ? next : [""]);
  }

  return (
    <div className="space-y-1.5">
      <Label>Web archive links (old website)</Label>
      <div className="space-y-2">
        {rows.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={link}
              onChange={(e) => setAt(i, e.target.value)}
              placeholder="https://web.archive.org/web/…"
            />
            {rows.length > 1 && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeAt(i)}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {rows.length < MAX_WEB_ARCHIVE_LINKS && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...rows, ""])}
        >
          <Plus className="size-4" />
          Add link
        </Button>
      )}
    </div>
  );
}
