import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { ClientsView, type ClientCard } from "@/components/views/clients-view";
import { AddClientDialog } from "@/components/clients/add-client-dialog";
import type { Client } from "@/lib/types";

export default async function ClientsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const canManage = can.manageClients(profile.role);

  const [clientsRes, projectsRes] = await Promise.all([
    supabase.from("clients").select("*").order("created_at", { ascending: false }),
    supabase.from("projects").select("client_id, status"),
  ]);
  const clients = (clientsRes.data as Client[]) ?? [];
  const projects =
    (projectsRes.data as { client_id: string; status: string }[]) ?? [];

  const cards: ClientCard[] = clients.map((c) => {
    const ps = projects.filter((p) => p.client_id === c.id);
    return {
      id: c.id,
      business_name: c.business_name,
      city: c.city,
      province: c.province,
      country: c.country,
      client_kind: c.client_kind,
      contact_name: c.contact_name,
      email: c.email,
      status: c.status,
      projectCount: ps.length,
      openCount: ps.filter((p) => p.status !== "live" && p.status !== "completed").length,
    };
  });

  const activeCount = clients.filter((c) => c.status === "active").length;

  return (
    <>
      <PageHeader
        eyebrow={`${clients.length} clients · ${activeCount} active`}
        title="Clients"
        search="Search clients…"
      >
        {canManage && <AddClientDialog />}
      </PageHeader>
      <ClientsView clients={cards} canManage={canManage} />
    </>
  );
}
