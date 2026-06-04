"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { addTeamMemberAction } from "@/app/(app)/team/actions";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddMemberDialog({
  variant = "primary",
}: {
  variant?: "primary" | "ghost";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>("designer");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const res = await addTeamMemberAction({
      full_name: (fd.get("full_name") as string).trim(),
      email: (fd.get("email") as string).trim(),
      role,
      password: (fd.get("password") as string) || undefined,
    });
    setLoading(false);
    if (res.error) return toast.error(res.error);
    toast.success("Team member added");
    setOpen(false);
    setRole("designer");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {variant === "ghost" ? (
        <DialogTrigger render={<button className="ghost" type="button" />}>
          <span className="inner">
            <Icon d="plus" />
            Add member
          </span>
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<button className="btn primary" type="button" />}>
          <Icon d="plus" />
          Add member
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>
              Creates a login for the new member. They can change their password
              after first sign-in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as UserRole)}
                  items={ROLE_LABELS}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Temp password</Label>
                <Input
                  id="password"
                  name="password"
                  placeholder="password123"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Add member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
