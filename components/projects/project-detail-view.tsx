"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  AttachmentWithUrl,
  CommentWithAuthor,
  TaskWithAssignee,
} from "@/app/(app)/projects/[id]/page";
import type { Profile, ProjectBrief, ProjectStatus } from "@/lib/types";
import {
  PROJECT_STATUS,
  TASK_STATUS,
  TASK_STATUS_ORDER,
} from "@/lib/constants";
import { setProjectStatusAction } from "@/app/(app)/projects/actions";
import { Icon } from "@/components/icon";
import { ClientLogo, AvatarStack } from "@/components/design";
import { ProjectStatusBadge } from "@/components/status-badge";
import { KanbanCard } from "@/components/board/kanban-card";
import { AddTaskDialog } from "@/components/projects/add-task-dialog";
import { ManageMembersDialog } from "@/components/projects/manage-members-dialog";

const STATUSES = Object.keys(PROJECT_STATUS) as ProjectStatus[];

export function ProjectDetailView({
  project,
  meta,
  tasks,
  attachmentsByTask,
  commentsByTask,
  team,
  memberIds,
  currentUserId,
  canManage,
  canMarkLive,
}: {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    brief: ProjectBrief | null;
    client: { id: string; business_name: string } | null;
  };
  meta: {
    progress: number;
    due: string;
    dueOver: boolean;
    taskTotal: number;
    taskOpen: number;
    team: { name: string; color: string }[];
  };
  tasks: TaskWithAssignee[];
  attachmentsByTask: Record<string, AttachmentWithUrl[]>;
  commentsByTask: Record<string, CommentWithAuthor[]>;
  team: Profile[];
  memberIds: string[];
  currentUserId: string;
  canManage: boolean;
  canMarkLive: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  async function setStatus(status: ProjectStatus) {
    const res = await setProjectStatusAction({ project_id: project.id, status });
    if (res.error) return toast.error(res.error);
    toast.success(`Marked "${PROJECT_STATUS[status].label}"`);
    router.refresh();
  }

  return (
    <>
      <Link href="/projects" className="crumb">
        <Icon d="back" size={16} />
        Projects
      </Link>

      <div className="detail-head">
        <div className="dh-left">
          <ClientLogo
            name={project.client?.business_name ?? "?"}
            size={46}
            radius={13}
          />
          <div>
            {project.client && (
              <Link
                href={`/clients/${project.client.id}`}
                className="eyebrow link"
              >
                {project.client.business_name}
              </Link>
            )}
            <h1 className="title" style={{ marginTop: 2 }}>
              {project.name}
            </h1>
            {project.description && (
              <div className="muted-sm" style={{ marginTop: 5 }}>
                {project.description}
              </div>
            )}
          </div>
        </div>
        <div className="dh-right">
          <ProjectStatusBadge status={project.status} />
          {canManage && (
            <select
              className="btn"
              value={project.status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS[s].label}
                </option>
              ))}
            </select>
          )}
          {canManage && (
            <ManageMembersDialog
              projectId={project.id}
              team={team}
              memberIds={memberIds}
            />
          )}
          {canMarkLive && project.status !== "live" && (
            <button className="btn" onClick={() => setStatus("live")}>
              <Icon d="rocket" />
              Mark live
            </button>
          )}
          {canManage && (
            <button className="btn primary" onClick={() => setAddOpen(true)}>
              <Icon d="plus" />
              Add task
            </button>
          )}
        </div>
      </div>

      <div className="detail-meta">
        <div className="meta-item">
          <span className="meta-l">Progress</span>
          <div className="meta-v" style={{ width: 140 }}>
            <div className="bar slim" style={{ flex: 1 }}>
              <i
                style={{
                  width: meta.progress + "%",
                  background:
                    project.status === "live" ? "var(--green)" : "var(--brand)",
                }}
              />
            </div>
            <span className="tnum">{meta.progress}%</span>
          </div>
        </div>
        <div className="meta-item">
          <span className="meta-l">Team</span>
          <AvatarStack people={meta.team} size={26} />
        </div>
        <div className="meta-item">
          <span className="meta-l">Next due</span>
          <span
            className={meta.dueOver ? "due over" : "fw6"}
            style={{ fontSize: 13.5 }}
          >
            {meta.due}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-l">Tasks</span>
          <span className="fw6" style={{ fontSize: 13.5 }}>
            {meta.taskTotal} total · {meta.taskOpen} open
          </span>
        </div>
      </div>

      {(() => {
        const b = project.brief;
        const items: [string, string | undefined][] = b
          ? [
              ["Desired pages", b.desired_pages],
              ["SEO keywords", b.seo_keywords],
              ["Colour preferences", b.color_preferences],
              ["Competitors", b.competitors],
              ["Reference sites", b.reference_sites],
              ["Extra notes", b.extra_notes],
            ].filter(([, v]) => v) as [string, string][]
          : [];
        if (items.length === 0) return null;
        return (
          <>
            <div className="sec-head" style={{ marginTop: 0, marginBottom: 14 }}>
              <h2>Brief</h2>
            </div>
            <div className="panel-card pad" style={{ padding: 18, marginBottom: 24 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px 30px",
                }}
              >
                {items.map(([label, value]) => (
                  <div key={label}>
                    <div className="meta-l">{label}</div>
                    <div style={{ fontSize: 13, marginTop: 5, lineHeight: 1.45 }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      })()}

      <div className="board board-inset">
        {TASK_STATUS_ORDER.map((st) => {
          const group = tasks.filter((t) => t.status === st);
          const s = TASK_STATUS[st];
          return (
            <div className="bcol" key={st}>
              <div className="bcol-head">
                <span className="dot" style={{ background: s.dot }} />
                <span className="fw6">{s.label}</span>
                <span className="muted-sm tnum">{group.length}</span>
              </div>
              <div className="bcol-body">
                {group.map((t) => (
                  <KanbanCard
                    key={t.id}
                    task={t}
                    projectId={project.id}
                    attachments={attachmentsByTask[t.id] ?? []}
                    comments={commentsByTask[t.id] ?? []}
                    currentUserId={currentUserId}
                    canEditStatus={
                      canManage || t.assignee?.id === currentUserId
                    }
                  />
                ))}
                {canManage && (
                  <button className="kadd" onClick={() => setAddOpen(true)}>
                    <Icon d="plus" size={14} />
                    Add task
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canManage && (
        <AddTaskDialog
          projectId={project.id}
          team={team}
          open={addOpen}
          onOpenChange={setAddOpen}
          showTrigger={false}
        />
      )}
    </>
  );
}
