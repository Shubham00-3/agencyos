"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createProjectAction } from "@/app/(app)/projects/actions";
import {
  addCredentialAction,
  createClientAction,
} from "@/app/(app)/clients/actions";
import { PROJECT_TYPES, PROJECT_TYPE_OTHER } from "@/lib/constants";
import { LifecycleToggle } from "@/components/clients/client-fields";
import type { LifecycleKind } from "@/lib/types";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  const [projectType, setProjectType] = useState<string>("");
  const [otherType, setOtherType] = useState("");
  const [projectKind, setProjectKind] = useState<LifecycleKind>("new");

  const clientItems: Record<string, string> = {
    ...Object.fromEntries(clients.map((c) => [c.id, c.business_name])),
    [NEW_CLIENT]: "+ Add a new client…",
  };

  const typeItems: Record<string, string> = {
    ...Object.fromEntries(PROJECT_TYPES.map((t) => [t, t])),
    [PROJECT_TYPE_OTHER]: PROJECT_TYPE_OTHER,
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string)?.trim() || undefined;
    const name = get("name");
    if (!clientId) return toast.error("Pick a client");
    if (!name) return toast.error("Enter a project name");

    // Resolve the project type — "Other" uses the free-text field.
    let resolvedType: string | undefined;
    if (projectType === PROJECT_TYPE_OTHER) {
      resolvedType = otherType.trim();
      if (!resolvedType) return toast.error("Specify the project type");
    } else if (projectType) {
      resolvedType = projectType;
    }

    setLoading(true);

    // Resolve the client — creating a brand-new one first if requested.
    let resolvedClientId = clientId;
    if (clientId === NEW_CLIENT) {
      const businessName = newClientName.trim();
      if (!businessName) {
        setLoading(false);
        return toast.error("Enter the new client's name");
      }
      const newCity = get("new_client_city");
      if (!newCity) {
        setLoading(false);
        return toast.error("Enter the new client's city");
      }
      const created = await createClientAction({
        business_name: businessName,
        city: newCity,
      });
      if (created.error || !created.id) {
        setLoading(false);
        return toast.error(created.error ?? "Could not create the client");
      }
      resolvedClientId = created.id;
    }

    const res = await createProjectAction({
      client_id: resolvedClientId,
      name,
      project_type: resolvedType,
      project_kind: projectKind,
      description: get("description"),
    });
    if (res.error || !res.id) {
      setLoading(false);
      return toast.error(res.error ?? "Could not create the project");
    }

    // Optional WordPress login, stored against this project.
    const wpUrl = get("wp_url");
    const wpUser = get("wp_username");
    const wpPass = get("wp_password");
    if (wpUrl || wpUser || wpPass) {
      await addCredentialAction(resolvedClientId, {
        kind: "wordpress",
        label: "WordPress Admin",
        url: wpUrl,
        username: wpUser,
        password: wpPass,
        project_id: res.id,
      });
    }

    setLoading(false);
    toast.success("Project created");
    setOpen(false);
    setClientId("");
    setNewClientName("");
    setProjectType("");
    setOtherType("");
    setProjectKind("new");
    router.refresh();
    router.push(`/projects/${res.id}`);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto scrollbar-thin sm:max-w-md">
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
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <Input
                    autoFocus
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="New client business name"
                  />
                  <Input
                    name="new_client_city"
                    placeholder="City (e.g. Toronto)"
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Project name</Label>
              <Input id="name" name="name" placeholder="Website redesign" required />
            </div>
            <div className="space-y-1.5">
              <Label>Project type</Label>
              <Select
                value={projectType}
                onValueChange={(v) => setProjectType(v ?? "")}
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
              {projectType === PROJECT_TYPE_OTHER && (
                <Input
                  autoFocus
                  value={otherType}
                  onChange={(e) => setOtherType(e.target.value)}
                  placeholder="Specify the project type"
                  className="mt-2"
                />
              )}
            </div>
            <LifecycleToggle
              label="Project type (new / old)"
              value={projectKind}
              onChange={setProjectKind}
            />
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Short summary of the build…"
              />
            </div>

            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              WordPress credentials (optional)
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="wp_url">WP admin URL</Label>
              <Input id="wp_url" name="wp_url" placeholder="https://site.ca/wp-admin" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wp_username">Username</Label>
                <Input id="wp_username" name="wp_username" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wp_password">Password</Label>
                <Input id="wp_password" name="wp_password" />
              </div>
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
