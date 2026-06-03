import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { getProjectsMeta } from "@/lib/projects";
import type { Client, ClientCredential } from "@/lib/types";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClientLogo } from "@/components/design";
import { ClientStatusBadge, ProjectStatusBadge } from "@/components/status-badge";
import { CredentialsVault } from "@/components/clients/credentials-vault";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: clientData } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  if (!clientData) notFound();
  const c = clientData as Client;

  const projects = await getProjectsMeta(supabase, { clientId: id });

  const showCreds = can.viewCredentials(profile.role);
  let credentials: ClientCredential[] = [];
  if (showCreds) {
    const { data } = await supabase
      .from("client_credentials")
      .select("*")
      .eq("client_id", id)
      .order("created_at");
    credentials = (data as ClientCredential[]) ?? [];
  }
  const openWork = projects.filter((p) => p.status !== "live").length;

  return (
    <div className="detail-top">
      <div className="detail-util">
        <ThemeToggle />
      </div>

      <Link href="/clients" className="crumb">
        <Icon d="back" size={16} />
        Clients
      </Link>

      <div className="detail-head">
        <div className="dh-left">
          <ClientLogo name={c.business_name} size={52} radius={15} />
          <div>
            <h1 className="title">{c.business_name}</h1>
            <div
              className="muted-sm"
              style={{ marginTop: 5, display: "flex", gap: 16, flexWrap: "wrap" }}
            >
              {c.email && (
                <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
                  <Icon d="mail" size={13} />
                  {c.email}
                </span>
              )}
              {c.phone && (
                <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
                  <Icon d="phone" size={13} />
                  {c.phone}
                </span>
              )}
              {c.existing_website_url && (
                <a
                  className="link"
                  href={c.existing_website_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", gap: 5, alignItems: "center" }}
                >
                  <Icon d="link" size={13} />
                  {c.existing_website_url.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="dh-right">
          {c.email && (
            <a className="btn" href={`mailto:${c.email}`}>
              <Icon d="mail" />
              Email
            </a>
          )}
          {can.manageProjects(profile.role) && (
            <NewProjectDialog
              clients={[{ id: c.id, business_name: c.business_name }]}
            />
          )}
        </div>
      </div>

      <div className="client-cols">
        <div>
          <div className="sec-head">
            <h2>Projects</h2>
            <span className="muted-sm">{projects.length} total</span>
          </div>
          {projects.length === 0 ? (
            <div className="panel-card pad">
              <div className="kv-row no-b">
                <span className="muted-sm">No projects yet.</span>
              </div>
            </div>
          ) : (
            <div className="table cols4">
              <div className="tr th">
                <div className="td-main">Project</div>
                <div className="td-prog">Progress</div>
                <div className="td-status">Status</div>
                <div className="td-arrow" />
              </div>
              {projects.map((p) => (
                <Link className="tr" key={p.id} href={`/projects/${p.id}`}>
                  <div className="td-main">
                    <div className="min0">
                      <div className="fw6 ell">{p.name}</div>
                      <div className="muted-sm ell">{p.description}</div>
                    </div>
                  </div>
                  <div className="td-prog">
                    <div className="bar slim">
                      <i
                        style={{
                          width: p.progress + "%",
                          background:
                            p.status === "live"
                              ? "var(--green)"
                              : "var(--brand)",
                        }}
                      />
                    </div>
                    <span className="tnum muted-sm">{p.progress}%</span>
                  </div>
                  <div className="td-status">
                    <ProjectStatusBadge status={p.status} />
                  </div>
                  <div className="td-arrow muted">
                    <Icon d="chevron" size={16} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="sec-head">
            <h2>Details</h2>
          </div>
          <div className="panel-card pad">
            <div className="kv-row">
              <span className="meta-l">Primary contact</span>
              <span className="fw6">{c.contact_name ?? "—"}</span>
            </div>
            <div className="kv-row">
              <span className="meta-l">Status</span>
              <ClientStatusBadge status={c.status} />
            </div>
            <div className="kv-row">
              <span className="meta-l">Website</span>
              {c.existing_website_url ? (
                <a
                  className="link"
                  href={c.existing_website_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {c.existing_website_url.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <span className="muted-sm">—</span>
              )}
            </div>
            <div className="kv-row no-b">
              <span className="meta-l">Open work</span>
              <span className="fw6">{openWork} active</span>
            </div>
          </div>

          {c.notes && (
            <>
              <div className="sec-head" style={{ marginTop: 22 }}>
                <h2>Notes</h2>
              </div>
              <div className="panel-card pad">
                <div className="kv-row no-b">
                  <span className="muted-sm" style={{ lineHeight: 1.5 }}>
                    {c.notes}
                  </span>
                </div>
              </div>
            </>
          )}

          {showCreds && (
            <div style={{ marginTop: 22 }}>
              <CredentialsVault clientId={id} credentials={credentials} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
