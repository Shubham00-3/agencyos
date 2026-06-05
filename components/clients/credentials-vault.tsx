"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Copy, Trash2, Plus, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ClientCredential, CredentialKind } from "@/lib/types";
import {
  addCredentialAction,
  deleteCredentialAction,
} from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const KIND_LABEL: Record<CredentialKind, string> = {
  wordpress: "WordPress",
  hosting: "Hosting",
  other: "Other",
};

function SecretRow({ label, value }: { label: string; value: string | null }) {
  const [shown, setShown] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
          {shown ? value : "•".repeat(Math.min(value.length, 12))}
        </code>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => setShown((s) => !s)}
        >
          {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
          }}
        >
          <Copy className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function CredentialsVault({
  clientId,
  credentials,
  canManage = false,
}: {
  clientId: string;
  credentials: ClientCredential[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<CredentialKind>("wordpress");

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string)?.trim() || undefined;
    setLoading(true);
    const res = await addCredentialAction(clientId, {
      kind,
      label: get("label") || KIND_LABEL[kind],
      url: get("url"),
      username: get("username"),
      password: get("password"),
      notes: get("notes"),
    });
    setLoading(false);
    if (res.error) return toast.error(res.error);
    toast.success("Credential saved");
    setOpen(false);
    router.refresh();
  }

  async function onDelete(id: string) {
    const res = await deleteCredentialAction(id, clientId);
    if (res.error) return toast.error(res.error);
    toast.success("Credential removed");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4 text-muted-foreground" />
          Credentials
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          {canManage && (
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
              <Plus className="size-4" />
              Add
            </DialogTrigger>
          )}
          <DialogContent>
            <form onSubmit={onAdd}>
              <DialogHeader>
                <DialogTitle>Add credential</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={kind}
                    onValueChange={(v) => setKind(v as CredentialKind)}
                    items={{
                      wordpress: "WordPress",
                      hosting: "Hosting",
                      other: "Other",
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wordpress">WordPress</SelectItem>
                      <SelectItem value="hosting">Hosting</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="label">Label</Label>
                  <Input id="label" name="label" placeholder={KIND_LABEL[kind]} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="url">URL</Label>
                  <Input id="url" name="url" placeholder="https://…" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" name="username" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="ghost" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No credentials stored yet.
          </p>
        ) : (
          credentials.map((c) => (
            <div key={c.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {KIND_LABEL[c.kind]}
                  </p>
                </div>
                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(c.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                {c.url && (
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">URL</span>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-primary hover:underline"
                    >
                      {c.url.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                <SecretRow label="Username" value={c.username} />
                <SecretRow label="Password" value={c.password} />
                {c.notes && (
                  <p className="pt-1 text-xs text-muted-foreground">{c.notes}</p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
