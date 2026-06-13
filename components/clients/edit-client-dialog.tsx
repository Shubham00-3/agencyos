"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateClientAction } from "@/app/(app)/clients/actions";
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
import { Separator } from "@/components/ui/separator";
import {
  LifecycleToggle,
  WebArchiveLinksInput,
} from "@/components/clients/client-fields";
import type { Client, ClientStatus, LifecycleKind } from "@/lib/types";

export function EditClientDialog({ client }: { client: Client }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [kind, setKind] = useState<LifecycleKind>(client.client_kind ?? "new");
  const [archiveLinks, setArchiveLinks] = useState<string[]>(
    client.web_archive_links?.length ? client.web_archive_links : [""],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string)?.trim() || undefined;
    const city = get("city");
    if (!city) return toast.error("City is required");
    setLoading(true);
    const res = await updateClientAction(client.id, {
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
      status,
      notes: get("notes"),
    });
    setLoading(false);
    if (res.error) return toast.error(res.error);
    toast.success("Client updated");
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
            <DialogTitle>Edit client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="business_name">Business name</Label>
                <Input
                  id="business_name"
                  name="business_name"
                  defaultValue={client.business_name}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={client.city ?? ""}
                  placeholder="Toronto"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="province">Province / State</Label>
                <Input
                  id="province"
                  name="province"
                  defaultValue={client.province ?? ""}
                  placeholder="Ontario"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  defaultValue={client.country ?? ""}
                  placeholder="Canada"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contact_name">Contact</Label>
                <Input
                  id="contact_name"
                  name="contact_name"
                  defaultValue={client.contact_name ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={client.phone ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={client.email ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="existing_website_url">Website</Label>
                <Input
                  id="existing_website_url"
                  name="existing_website_url"
                  defaultValue={client.existing_website_url ?? ""}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ClientStatus)}
                items={{ active: "Active", completed: "Completed" }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <LifecycleToggle label="Client type" value={kind} onChange={setKind} />

            <Separator />
            <WebArchiveLinksInput value={archiveLinks} onChange={setArchiveLinks} />
            <div className="space-y-1.5">
              <Label htmlFor="last_website_notes">Last website notes</Label>
              <Textarea
                id="last_website_notes"
                name="last_website_notes"
                defaultValue={client.last_website_notes ?? ""}
                placeholder="What was on their previous site, what to carry over…"
              />
            </div>

            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={client.notes ?? ""}
              />
            </div>
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
