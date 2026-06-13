"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateProjectAction } from "@/app/(app)/projects/actions";
import { Icon } from "@/components/icon";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PROJECT_TYPES, PROJECT_TYPE_OTHER } from "@/lib/constants";
import { LifecycleToggle } from "@/components/clients/client-fields";
import type { LifecycleKind, ProjectBrief } from "@/lib/types";

const BRIEF_FIELDS: [keyof ProjectBrief, string][] = [
  ["desired_pages", "Desired pages"],
  ["seo_keywords", "SEO keywords"],
  ["color_preferences", "Colour preferences"],
  ["competitors", "Competitors"],
  ["reference_sites", "Reference sites"],
  ["extra_notes", "Extra notes"],
];

export function EditProjectDialog({
  projectId,
  name,
  projectType,
  projectKind,
  description,
  brief,
}: {
  projectId: string;
  name: string;
  projectType: string | null;
  projectKind: LifecycleKind;
  description: string | null;
  brief: ProjectBrief | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<LifecycleKind>(projectKind ?? "new");
  // A stored type that isn't one of the predefined options is a custom "Other".
  const isPredefined =
    !!projectType &&
    (PROJECT_TYPES as readonly string[]).includes(projectType);
  const [type, setType] = useState<string>(
    projectType ? (isPredefined ? projectType : PROJECT_TYPE_OTHER) : "",
  );
  const [otherType, setOtherType] = useState(
    projectType && !isPredefined ? projectType : "",
  );

  const typeItems: Record<string, string> = {
    ...Object.fromEntries(PROJECT_TYPES.map((t) => [t, t])),
    [PROJECT_TYPE_OTHER]: PROJECT_TYPE_OTHER,
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    if (!name) return toast.error("Name required");

    let resolvedType: string | null = null;
    if (type === PROJECT_TYPE_OTHER) {
      resolvedType = otherType.trim();
      if (!resolvedType) return toast.error("Specify the project type");
    } else if (type) {
      resolvedType = type;
    }

    const nextBrief: Record<string, string> = {};
    BRIEF_FIELDS.forEach(([key]) => {
      const v = (fd.get(`brief_${key}`) as string)?.trim();
      if (v) nextBrief[key] = v;
    });

    setLoading(true);
    const res = await updateProjectAction({
      project_id: projectId,
      name,
      project_type: resolvedType,
      project_kind: kind,
      description: (fd.get("description") as string)?.trim() || null,
      brief: Object.keys(nextBrief).length ? nextBrief : null,
    });
    setLoading(false);
    if (res.error) return toast.error(res.error);
    toast.success("Project updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="btn" type="button" />}>
        <Icon d="dots" />
        Edit
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto scrollbar-thin sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Project name</Label>
              <Input id="name" name="name" defaultValue={name} required />
            </div>
            <div className="space-y-1.5">
              <Label>Project type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v ?? "")}
                items={typeItems}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                  <SelectItem value={PROJECT_TYPE_OTHER}>
                    {PROJECT_TYPE_OTHER}…
                  </SelectItem>
                </SelectContent>
              </Select>
              {type === PROJECT_TYPE_OTHER && (
                <Input
                  value={otherType}
                  onChange={(e) => setOtherType(e.target.value)}
                  placeholder="Specify the project type"
                  className="mt-2"
                />
              )}
            </div>
            <LifecycleToggle
              label="Project type (new / old)"
              value={kind}
              onChange={setKind}
            />
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={description ?? ""}
              />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Brief
            </p>
            {BRIEF_FIELDS.map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`brief_${key}`}>{label}</Label>
                <Input
                  id={`brief_${key}`}
                  name={`brief_${key}`}
                  defaultValue={brief?.[key] ?? ""}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
