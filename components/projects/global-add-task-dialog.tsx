"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createTaskAction } from "@/app/(app)/projects/actions";
import type { Profile, TaskCategory } from "@/lib/types";
import { TASK_CATEGORY } from "@/lib/constants";
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

const CATEGORIES = Object.keys(TASK_CATEGORY) as TaskCategory[];
const UNASSIGNED = "unassigned";

export function GlobalAddTaskDialog({
  projects,
  team,
}: {
  projects: { id: string; name: string; clientName: string | null }[];
  team: Profile[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState<TaskCategory>("general");
  const [assignee, setAssignee] = useState(UNASSIGNED);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = (fd.get("title") as string)?.trim();
    if (!projectId) return toast.error("Pick a project");
    if (!title) return toast.error("Task title required");

    setLoading(true);
    const res = await createTaskAction({
      project_id: projectId,
      title,
      description: (fd.get("description") as string)?.trim() || undefined,
      category,
      assignee_id: assignee === UNASSIGNED ? null : assignee,
      due_date: (fd.get("due_date") as string) || null,
    });
    setLoading(false);

    if (res.error) return toast.error(res.error);
    toast.success("Task created");
    setOpen(false);
    setProjectId("");
    setCategory("general");
    setAssignee(UNASSIGNED);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="btn primary" type="button" />}>
        <Plus className="size-4" />
        Add task
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={(v) => setProjectId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {[p.clientName, p.name].filter(Boolean).join(" - ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="global-task-title">Title</Label>
              <Input
                id="global-task-title"
                name="title"
                placeholder="Design homepage mockup"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="global-task-description">Task explanation</Label>
              <Textarea
                id="global-task-description"
                name="description"
                placeholder="Explain exactly what needs to be done, what to upload, and any client requirements."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as TaskCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {TASK_CATEGORY[c].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="global-task-due">Due date</Label>
                <Input id="global-task-due" name="due_date" type="date" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select
                value={assignee}
                onValueChange={(v) => setAssignee(v ?? UNASSIGNED)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {team.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
