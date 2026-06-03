"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProjectMeta } from "@/lib/projects";
import type { ProjectStatus } from "@/lib/types";
import { Icon } from "@/components/icon";
import {
  ClientLogo,
  AvatarStack,
  Progress,
  Due,
  PersonAvatar,
} from "@/components/design";
import { ProjectStatusBadge } from "@/components/status-badge";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { useSearch, matches } from "@/components/search/search-context";

export type Kpis = {
  activeClients: number;
  inProgress: number;
  inReview: number;
  overdue: number;
};
export type WeekItem = { day: string; pip: string; title: string; who: string };
export type ActivityItem = {
  name: string;
  color: string;
  text: string;
  when: string;
};

const FILTERS: [ProjectStatus | "all", string][] = [
  ["all", "All"],
  ["in_progress", "In progress"],
  ["in_review", "In review"],
  ["live", "Live"],
  ["not_started", "Not started"],
];

function ProjectCard({ p }: { p: ProjectMeta }) {
  return (
    <Link className="card" href={`/projects/${p.id}`}>
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
  );
}

export function DashboardView({
  projects,
  kpis,
  week,
  activity,
  canManage,
  clients,
}: {
  projects: ProjectMeta[];
  kpis: Kpis;
  week: WeekItem[];
  activity: ActivityItem[];
  canManage: boolean;
  clients: { id: string; business_name: string }[];
}) {
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const { q } = useSearch();
  const counts: Record<string, number> = { all: projects.length };
  projects.forEach((p) => (counts[p.status] = (counts[p.status] || 0) + 1));
  const shown = projects
    .filter((p) => filter === "all" || p.status === filter)
    .filter((p) => matches(q, p.name, p.client?.business_name));

  return (
    <>
      <div className="kpis">
        <div className="kpi">
          <div className="v tnum">{kpis.activeClients}</div>
          <div className="l">
            <span className="dot" style={{ background: "var(--brand)" }} />
            Active clients
          </div>
        </div>
        <div className="kpi">
          <div className="v tnum">{kpis.inProgress}</div>
          <div className="l">
            <span className="dot" style={{ background: "var(--brand)" }} />
            In progress
          </div>
        </div>
        <div className="kpi">
          <div className="v tnum">{kpis.inReview}</div>
          <div className="l">
            <span className="dot" style={{ background: "var(--amber)" }} />
            Awaiting review
          </div>
        </div>
        <div className="kpi">
          <div
            className="v tnum"
            style={{ color: kpis.overdue ? "var(--red)" : "var(--ink)" }}
          >
            {kpis.overdue}
          </div>
          <div className="l">
            <span className="dot" style={{ background: "var(--red)" }} />
            Overdue tasks
          </div>
        </div>
      </div>

      <div className="filterbar">
        <div className="chips">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              className={"chip" + (filter === id ? " on" : "")}
              onClick={() => setFilter(id)}
            >
              {label}
              <span className="c">{counts[id] || 0}</span>
            </button>
          ))}
        </div>
        <span className="sortbtn">
          <Icon d="sort" />
          Recently updated
        </span>
      </div>

      <div className="grid">
        {shown.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
        {filter === "all" && canManage && (
          <NewProjectDialog clients={clients} variant="ghost" />
        )}
      </div>

      <div className="cols2">
        <div>
          <div className="sec-head">
            <h2>Due this week</h2>
          </div>
          {week.length === 0 ? (
            <div className="panel-card pad">
              <div className="kv-row no-b">
                <span className="muted-sm">Nothing due this week.</span>
              </div>
            </div>
          ) : (
            <div className="week">
              {week.map((w, i) => (
                <div className="wk" key={i}>
                  <div className="day">
                    {w.day}
                    <span className="pip" style={{ background: w.pip }} />
                  </div>
                  <div className="t">{w.title}</div>
                  <div className="m">{w.who}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="sec-head">
            <h2>Recent activity</h2>
          </div>
          <div className="panel-card">
            {activity.length === 0 ? (
              <div className="act">
                <span className="muted-sm">No activity yet.</span>
              </div>
            ) : (
              activity.map((a, i) => (
                <div className="act" key={i}>
                  <PersonAvatar name={a.name} color={a.color} size={26} />
                  <div className="act-body">
                    <span className="fw6">{a.name.split(" ")[0]}</span> {a.text}
                  </div>
                  <span className="muted-sm">{a.when}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
