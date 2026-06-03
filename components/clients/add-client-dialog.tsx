"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import {
  createClientAction,
  type CredentialInput,
  type NewClientInput,
} from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string)?.trim() || undefined;

    const credentials: CredentialInput[] = [];
    if (get("wp_username") || get("wp_password") || get("wp_url")) {
      credentials.push({
        kind: "wordpress",
        label: "WordPress Admin",
        url: get("wp_url"),
        username: get("wp_username"),
        password: get("wp_password"),
      });
    }
    if (get("host_username") || get("host_password") || get("host_url")) {
      credentials.push({
        kind: "hosting",
        label: "Hosting",
        url: get("host_url"),
        username: get("host_username"),
        password: get("host_password"),
      });
    }

    const input: NewClientInput = {
      business_name: get("business_name")!,
      contact_name: get("contact_name"),
      phone: get("phone"),
      email: get("email"),
      existing_website_url: get("existing_website_url"),
      notes: get("notes"),
      credentials,
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
              For a client whose deal has already closed. Credentials are
              optional and only visible to PA, CEO and admins.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Field
              label="Business name"
              name="business_name"
              placeholder="Greenleaf Plumbing"
              required
            />
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

            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              WordPress credentials
            </p>
            <Field label="WP admin URL" name="wp_url" placeholder="https://site.ca/wp-admin" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Username" name="wp_username" />
              <Field label="Password" name="wp_password" />
            </div>

            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hosting credentials
            </p>
            <Field label="Host / panel URL" name="host_url" placeholder="https://siteground.com" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Username" name="host_username" />
              <Field label="Password" name="host_password" />
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
