"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { ClientLogo } from "@/components/design";
import { ClientStatusBadge } from "@/components/status-badge";
import { AddClientDialog } from "@/components/clients/add-client-dialog";
import { useSearch, matches } from "@/components/search/search-context";
import type { ClientStatus } from "@/lib/types";

export type ClientCard = {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  status: ClientStatus;
  projectCount: number;
  openCount: number;
};

const TABS: [ClientStatus | "all", string][] = [
  ["active", "Active"],
  ["completed", "Completed"],
  ["all", "All"],
];

export function ClientsView({
  clients,
  canManage,
}: {
  clients: ClientCard[];
  canManage: boolean;
}) {
  const [tab, setTab] = useState<ClientStatus | "all">("active");
  const { q } = useSearch();
  const list = clients
    .filter((c) => (tab === "all" ? true : c.status === tab))
    .filter((c) => matches(q, c.business_name, c.contact_name, c.email));

  return (
    <>
      <div className="filterbar" style={{ marginTop: 4 }}>
        <div className="chips">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              className={"chip" + (tab === id ? " on" : "")}
              onClick={() => setTab(id)}
            >
              {label}
              <span className="c">
                {id === "all"
                  ? clients.length
                  : clients.filter((c) => c.status === id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="cardgrid">
        {list.map((c) => (
          <Link className="card" key={c.id} href={`/clients/${c.id}`}>
            <div className="card-top">
              <div className="client">
                <ClientLogo name={c.business_name} size={38} radius={11} />
                <div className="min0">
                  <div className="ptitle ell" style={{ fontSize: 15 }}>
                    {c.business_name}
                  </div>
                  <div className="muted-sm ell">{c.contact_name ?? "—"}</div>
                </div>
              </div>
              <ClientStatusBadge status={c.status} />
            </div>
            {c.email && (
              <div className="kv">
                <span className="muted-sm">
                  <Icon d="mail" size={13} /> {c.email}
                </span>
              </div>
            )}
            <div className="card-foot">
              <span className="muted-sm">
                {c.projectCount} project{c.projectCount !== 1 ? "s" : ""}
              </span>
              <span className="muted-sm">{c.openCount} active</span>
            </div>
          </Link>
        ))}
        {canManage && <AddClientDialog variant="ghost" />}
      </div>
    </>
  );
}
