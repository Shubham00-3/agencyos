"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProjectMeta } from "@/lib/projects";
import type { ProjectStatus } from "@/lib/types";
import { Icon } from "@/components/icon";
import { ClientLogo, AvatarStack, Progress, Due } from "@/components/design";
import { ProjectStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/page-header";
import { useSearch, matches } from "@/components/search/search-context";

const FILTERS: [ProjectStatus | "all", string][] = [
  ["all", "All"],
  ["in_progress", "In progress"],
  ["in_review", "In review"],
  ["live", "Live"],
  ["not_started", "Not started"],
];

export function ProjectsView({ projects }: { projects: ProjectMeta[] }) {
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const { q } = useSearch();
  const shown = projects
    .filter((p) => filter === "all" || p.status === filter)
    .filter((p) => matches(q, p.name, p.client?.business_name));

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
        <div className="cardgrid">
          {shown.map((p) => (
            <Link className="card" key={p.id} href={`/projects/${p.id}`}>
              <div className="card-top">
                <div className="client">
                  <ClientLogo name={p.client?.business_name ?? "?"} />
                  <span className="cname">{p.client?.business_name}</span>
                </div>
                <ProjectStatusBadge status={p.status} />
              </div>
              <div>
                <div className="ptitle">{p.name}</div>
                {p.description && <div className="pdesc">{p.description}</div>}
              </div>
              <Progress value={p.progress} live={p.status === "live"} />
              <div className="card-foot">
                <AvatarStack people={p.team} />
                <Due value={p.due} over={p.dueOver} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
