"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import {
  createClientAction,
  type NewClientInput,
} from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  LifecycleToggle,
  WebArchiveLinksInput,
} from "@/components/clients/client-fields";
import type { LifecycleKind } from "@/lib/types";
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

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

export function AddClientDialog({
  variant = "primary",
}: {
  variant?: "primary" | "ghost";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<LifecycleKind>("new");
  const [archiveLinks, setArchiveLinks] = useState<string[]>([""]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string)?.trim() || undefined;

    const city = get("city");
    if (!city) {
      toast.error("City is required");
      return;
    }

    const input: NewClientInput = {
      business_name: get("business_name")!,
      city,
      province: get("province"),
      country: get("country"),
      client_kind: kind,
      web_archive_links: archiveLinks,
      last_website_notes: get("last_website_notes"),
      contact_name: get("contact_name"),
      phone: get("phone"),
      email: get("email"),
      existing_website_url: get("existing_website_url"),
      notes: get("notes"),
    };

    setLoading(true);
    const res = await createClientAction(input);
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Client added");
    setOpen(false);
    setKind("new");
    setArchiveLinks([""]);
    router.refresh();
    if (res.id) router.push(`/clients/${res.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {variant === "ghost" ? (
        <DialogTrigger render={<button className="ghost" type="button" />}>
          <span className="inner">
            <Icon d="plus" />
            Add client
          </span>
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<button className="btn primary" type="button" />}>
          <Icon d="plus" />
          Add client
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto scrollbar-thin sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add client</DialogTitle>
            <DialogDescription>
              For a client whose deal has already closed. WordPress and hosting
              logins are stored per project, not here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Business name"
                name="business_name"
                placeholder="Greenleaf Plumbing"
                required
              />
              <Field
                label="City"
                name="city"
                placeholder="Toronto"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Province / State" name="province" placeholder="Ontario" />
              <Field label="Country" name="country" placeholder="Canada" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact name" name="contact_name" placeholder="Mike Torrence" />
              <Field label="Phone" name="phone" placeholder="+1 416-555-0148" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" name="email" type="email" placeholder="mike@site.ca" />
              <Field
                label="Existing website"
                name="existing_website_url"
                placeholder="https://site.ca"
              />
            </div>
            <LifecycleToggle label="Client type" value={kind} onChange={setKind} />

            <Separator />
            <WebArchiveLinksInput value={archiveLinks} onChange={setArchiveLinks} />
            <div className="space-y-1.5">
              <Label htmlFor="last_website_notes">Last website notes</Label>
              <Textarea
                id="last_website_notes"
                name="last_website_notes"
                placeholder="What was on their previous site, what to carry over…"
              />
            </div>

            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Anything the team should know…" />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Add client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
