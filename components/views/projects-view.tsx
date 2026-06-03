"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProjectMeta } from "@/lib/projects";
import type { ProjectStatus } from "@/lib/types";
import { Icon } from "@/components/icon";
import { ClientLogo, AvatarStack } from "@/components/design";
import { ProjectStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/page-header";

const FILTERS: [ProjectStatus | "all", string][] = [
  ["all", "All"],
  ["in_progress", "In progress"],
  ["in_review", "In review"],
  ["live", "Live"],
  ["not_started", "Not started"],
];

export function ProjectsView({ projects }: { projects: ProjectMeta[] }) {
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const shown =
    filter === "all" ? projects : projects.filter((p) => p.status === filter);

  return (
    <>
      <div className="filterbar" style={{ marginTop: 4 }}>
        <div className="chips">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              className={"chip" + (filter === id ? " on" : "")}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="sortbtn">
          <Icon d="sort" />
          Recently updated
        </span>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="No projects here" description="Try a different filter." />
      ) : (
        <div className="table">
          <div className="tr th">
            <div className="td-main">Project</div>
            <div className="td-prog">Progress</div>
            <div className="td-team">Team</div>
            <div className="td-status">Status</div>
            <div className="td-due">Due</div>
            <div className="td-arrow" />
          </div>
          {shown.map((p) => (
            <Link className="tr" key={p.id} href={`/projects/${p.id}`}>
              <div className="td-main">
                <ClientLogo
                  name={p.client?.business_name ?? "?"}
                  size={32}
                  radius={9}
                />
                <div className="min0">
                  <div className="fw6 ell">{p.name}</div>
                  <div className="muted-sm ell">
                    {p.client?.business_name}
                  </div>
                </div>
              </div>
              <div className="td-prog">
                <div className="bar slim">
                  <i
                    style={{
                      width: p.progress + "%",
                      background:
                        p.status === "live" ? "var(--green)" : "var(--brand)",
                    }}
                  />
                </div>
                <span className="tnum muted-sm">{p.progress}%</span>
              </div>
              <div className="td-team">
                <AvatarStack people={p.team} size={24} />
              </div>
              <div className="td-status">
                <ProjectStatusBadge status={p.status} />
              </div>
              <div className="td-due">
                <span className={p.dueOver ? "due over" : "muted-sm"}>
                  {p.due}
                </span>
              </div>
              <div className="td-arrow muted">
                <Icon d="chevron" size={16} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
