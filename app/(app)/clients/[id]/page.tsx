import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { getProjectsMeta } from "@/lib/projects";
import { formatLocation, LIFECYCLE_LABEL } from "@/lib/constants";
import type { Client, ClientAttachment } from "@/lib/types";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClientLogo } from "@/components/design";
import { ClientStatusBadge, ProjectStatusBadge } from "@/components/status-badge";
import { DetailUnavailable } from "@/components/detail-unavailable";
import { EditClientDialog } from "@/components/clients/edit-client-dialog";
import {
  ClientAttachments,
  type ClientAttachmentItem,
} from "@/components/clients/client-attachments";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (clientError) {
    return (
      <DetailUnavailable
        eyebrow="Client"
        title="Client could not be loaded"
        message="The client detail page received an error from Supabase. This is usually a migration, schema-cache, or permission issue rather than a missing page."
        backHref="/clients"
        backLabel="Clients"
        error={clientError.message}
      />
    );
  }
  if (!clientData) {
    return (
      <DetailUnavailable
        eyebrow="Client"
        title="Client is not available"
        message="This client was not found or your current role cannot open its full client record. Go back to the client list or switch to a manager account."
        backHref="/clients"
        backLabel="Clients"
      />
    );
  }
  const c = clientData as Client;
  // Defensive: tolerate the brief window before migration 0015 lands the column.
  const archiveLinks = c.web_archive_links ?? [];

  const projects = await getProjectsMeta(supabase, { clientId: id });
  const openWork = projects.filter((p) => p.status !== "live").length;

  // Client attachments (staff-only via RLS) + short-lived signed download URLs.
  const { data: attData } = await supabase
    .from("client_attachments")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });
  const attachmentRows = (attData as ClientAttachment[]) ?? [];
  const signedUrls = await Promise.all(
    attachmentRows.map((a) =>
      supabase.storage
        .from("attachments")
        .createSignedUrl(a.storage_path, 3600)
        .then((r) => r.data?.signedUrl ?? null),
    ),
  );
  const attachments: ClientAttachmentItem[] = attachmentRows.map((a, i) => ({
    id: a.id,
    file_name: a.file_name,
    storage_path: a.storage_path,
    file_size: a.file_size,
    created_at: a.created_at,
    url: signedUrls[i],
  }));

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
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <h1 className="title">{c.business_name}</h1>
              {c.client_kind === "old" && (
                <span className="catpill">{LIFECYCLE_LABEL.old}</span>
              )}
            </div>
            <div
              className="muted-sm"
              style={{ marginTop: 5, display: "flex", gap: 16, flexWrap: "wrap" }}
            >
              <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
                <Icon d="pin" size={13} />
                {formatLocation(c)}
              </span>
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
          {can.manageClients(profile.role) && <EditClientDialog client={c} />}
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
              <span className="meta-l">Location</span>
              <span className="fw6">{formatLocation(c)}</span>
            </div>
            <div className="kv-row">
              <span className="meta-l">Client type</span>
              <span className="fw6">{LIFECYCLE_LABEL[c.client_kind]}</span>
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

          {(archiveLinks.length > 0 || c.last_website_notes) && (
            <>
              <div className="sec-head" style={{ marginTop: 22 }}>
                <h2>Previous website</h2>
              </div>
              <div className="panel-card pad">
                {c.last_website_notes && (
                  <div className="kv-row">
                    <span className="muted-sm" style={{ lineHeight: 1.5 }}>
                      {c.last_website_notes}
                    </span>
                  </div>
                )}
                {archiveLinks.map((url, i) => (
                  <div
                    className={
                      "kv-row" + (i === archiveLinks.length - 1 ? " no-b" : "")
                    }
                    key={url + i}
                  >
                    <span className="meta-l">Archive {i + 1}</span>
                    <a
                      className="link"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {url.replace(/^https?:\/\//, "").slice(0, 40)}…
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}

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

          <div style={{ marginTop: 22 }}>
            <ClientAttachments
              clientId={id}
              attachments={attachments}
              canManage={can.manageClients(profile.role)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
