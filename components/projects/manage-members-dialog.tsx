"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setProjectMembersAction } from "@/app/(app)/projects/actions";
import type { Profile } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";
import { Icon } from "@/components/icon";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ManageMembersDialog({
  projectId,
  team,
  memberIds,
}: {
  projectId: string;
  team: Profile[];
  memberIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(memberIds));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setLoading(true);
    const res = await setProjectMembersAction({
      project_id: projectId,
      user_ids: Array.from(selected),
    });
    setLoading(false);
    if (res.error) return toast.error(res.error);
    toast.success("Team updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="btn" type="button" />}>
        <Icon d="team" />
        Team
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Project team</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 space-y-1 overflow-y-auto scrollbar-thin py-2">
          {team.map((m) => {
            const checked = selected.has(m.id);
            return (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-accent/40"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(m.id)}
                  className="size-4 accent-primary"
                />
                <UserAvatar
                  name={m.full_name}
                  color={m.avatar_color}
                  className="size-7"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[m.role]}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>
            Cancel
          </DialogClose>
          <Button onClick={save} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
