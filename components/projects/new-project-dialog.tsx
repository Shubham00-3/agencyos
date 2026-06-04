"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createProjectAction } from "@/app/(app)/projects/actions";
import { createClientAction } from "@/app/(app)/clients/actions";
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

const NEW_CLIENT = "__new_client__";

export function NewProjectDialog({
  clients,
  variant = "primary",
}: {
  clients: { id: string; business_name: string }[];
  variant?: "primary" | "ghost";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [newClientName, setNewClientName] = useState("");

  const clientItems: Record<string, string> = {
    ...Object.fromEntries(clients.map((c) => [c.id, c.business_name])),
    [NEW_CLIENT]: "+ Add a new client…",
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    if (!clientId) return toast.error("Pick a client");
    if (!name) return toast.error("Enter a project name");

    setLoading(true);

    // Resolve the client — creating a brand-new one first if requested.
    let resolvedClientId = clientId;
    if (clientId === NEW_CLIENT) {
      const businessName = newClientName.trim();
      if (!businessName) {
        setLoading(false);
        return toast.error("Enter the new client's name");
      }
      const created = await createClientAction({ business_name: businessName });
      if (created.error || !created.id) {
        setLoading(false);
        return toast.error(created.error ?? "Could not create the client");
      }
      resolvedClientId = created.id;
    }

    const res = await createProjectAction({
      client_id: resolvedClientId,
      name,
      description: (fd.get("description") as string)?.trim() || undefined,
    });
    setLoading(false);
    if (res.error) return toast.error(res.error);
    toast.success("Project created");
    setOpen(false);
    setClientId("");
    setNewClientName("");
    router.refresh();
    if (res.id) router.push(`/projects/${res.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {variant === "ghost" ? (
        <DialogTrigger render={<button className="ghost" type="button" />}>
          <span className="inner">
            <Icon d="plus" />
            New project
          </span>
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<button className="btn primary" type="button" />}>
          <Icon d="plus" />
          New project
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select
                value={clientId}
                onValueChange={(v) => setClientId(v ?? "")}
                items={clientItems}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.business_name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_CLIENT}>
                    + Add a new client…
                  </SelectItem>
                </SelectContent>
              </Select>
              {clientId === NEW_CLIENT && (
                <Input
                  autoFocus
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="New client business name"
                  className="mt-2"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Project name</Label>
              <Input id="name" name="name" placeholder="Website redesign" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Short summary of the build…"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
