"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type {
  AttachmentWithUrl,
  CommentWithAuthor,
  TaskWithAssignee,
} from "@/app/(app)/projects/[id]/page";
import type {
  ClientCredential,
  LifecycleKind,
  Profile,
  ProjectBrief,
  ProjectStatus,
  TaskStatus,
  UserRole,
} from "@/lib/types";
import {
  LIFECYCLE_LABEL,
  PROJECT_STATUS,
  TASK_STATUS,
  TASK_STATUS_ORDER,
} from "@/lib/constants";
import {
  generateWorkflowAction,
  setProjectStatusAction,
} from "@/app/(app)/projects/actions";
import { Icon } from "@/components/icon";
import { ClientLogo, AvatarStack } from "@/components/design";
import { ProjectStatusBadge } from "@/components/status-badge";
import { KanbanCard } from "@/components/board/kanban-card";
import { AddTaskDialog } from "@/components/projects/add-task-dialog";
import { ManageMembersDialog } from "@/components/projects/manage-members-dialog";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { CredentialsVault } from "@/components/clients/credentials-vault";

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
  currentUserRole,
  canManage,
  canMarkLive,
  credentials,
  showCredentials,
  canManageCredentials,
  communicationsSlot,
}: {
  project: {
    id: string;
    name: string;
    project_type: string | null;
    project_kind: LifecycleKind;
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
  currentUserRole: UserRole;
  canManage: boolean;
  canMarkLive: boolean;
  credentials: ClientCredential[];
  showCredentials: boolean;
  canManageCredentials: boolean;
  communicationsSlot: ReactNode;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [mine, setMine] = useState(false);
  const [generating, setGenerating] = useState(false);
  const hasWorkflow = tasks.some((t) => t.stage);

  async function generateWorkflow() {
    setGenerating(true);
    const res = await generateWorkflowAction({ project_id: project.id });
    setGenerating(false);
    if (res.error) return toast.error(res.error);
    toast.success(
      res.added ? `Added ${res.added} workflow tasks` : "Workflow already set up",
    );
    router.refresh();
  }
  // Sections start collapsed; clicking a header expands it (animated).
  const [openSec, setOpenSec] = useState<Record<string, boolean>>({});
  const toggle = (st: TaskStatus) =>
    setOpenSec((o) => ({ ...o, [st]: !o[st] }));

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
            <div
              className="muted-sm"
              style={{ marginTop: 5, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
            >
              {project.project_type && (
                <span className="catpill">{project.project_type}</span>
              )}
              {project.project_kind === "old" && (
                <span className="catpill">{LIFECYCLE_LABEL.old}</span>
              )}
              {project.description && <span>{project.description}</span>}
            </div>
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
            <EditProjectDialog
              projectId={project.id}
              name={project.name}
              projectType={project.project_type}
              projectKind={project.project_kind}
              description={project.description}
              brief={project.brief}
            />
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
            <button
              className="btn"
              disabled={generating}
              onClick={generateWorkflow}
            >
              <Icon d="tasks" />
              {hasWorkflow ? "Check workflow" : "Generate workflow"}
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

      <div className="statgrid">
        <div className="statcard">
          <span className="si">
            <Icon d="activity" />
          </span>
          <div className="sbody">
            <div className="sl">Progress</div>
            <div className="sv">
              <div className="bar slim" style={{ flex: 1, marginTop: 0 }}>
                <i
                  style={{
                    width: meta.progress + "%",
                    background:
                      project.status === "live"
                        ? "var(--green)"
                        : "var(--brand)",
                  }}
                />
              </div>
              <span className="tnum">{meta.progress}%</span>
            </div>
          </div>
        </div>
        <div className="statcard">
          <span className="si">
            <Icon d="team" />
          </span>
          <div className="sbody">
            <div className="sl">Team</div>
            <div className="sv">
              <AvatarStack people={meta.team} size={26} />
            </div>
          </div>
        </div>
        <div className="statcard">
          <span
            className="si"
            style={
              meta.dueOver
                ? { background: "var(--red-soft)", color: "var(--red)" }
                : undefined
            }
          >
            <Icon d="hourglass" />
          </span>
          <div className="sbody">
            <div className="sl">Next due</div>
            <div className={"sv" + (meta.dueOver ? " over" : "")}>
              {meta.due}
            </div>
          </div>
        </div>
        <div className="statcard">
          <span className="si">
            <Icon d="tasks" />
          </span>
          <div className="sbody">
            <div className="sl">Tasks</div>
            <div className="sv">
              {meta.taskTotal} total · {meta.taskOpen} open
            </div>
          </div>
        </div>
      </div>

      {(() => {
        const b = project.brief;
        const items: [string, string, string | undefined][] = b
          ? ([
              ["doc", "Desired pages", b.desired_pages],
              ["search", "SEO keywords", b.seo_keywords],
              ["droplet", "Colour preferences", b.color_preferences],
              ["user", "Competitors", b.competitors],
              ["link", "Reference sites", b.reference_sites],
              ["note", "Extra notes", b.extra_notes],
            ].filter(([, , v]) => v) as [string, string, string][])
          : [];
        if (items.length === 0) return null;
        return (
          <>
            <div className="sec-head" style={{ marginTop: 0, marginBottom: 14 }}>
              <h2>Brief</h2>
            </div>
            <div
              className="panel-card pad"
              style={{ padding: 20, marginBottom: 24 }}
            >
              <div className="brief-grid">
                {items.map(([icon, label, value]) => (
                  <div className="brief-item" key={label}>
                    <span className="brief-ic">
                      <Icon d={icon} />
                    </span>
                    <div className="min0">
                      <div className="brief-l">{label}</div>
                      <div className="brief-v">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      })()}

      {showCredentials && project.client && (
        <div style={{ marginBottom: 24 }}>
          <CredentialsVault
            clientId={project.client.id}
            projectId={project.id}
            credentials={credentials}
            canManage={canManageCredentials}
          />
        </div>
      )}

      <div style={{ marginBottom: 24 }}>{communicationsSlot}</div>

      <div className="filterbar" style={{ marginBottom: 6 }}>
        <div className="chips">
          <button
            className={"chip" + (!mine ? " on" : "")}
            onClick={() => setMine(false)}
          >
            All tasks
          </button>
          <button
            className={"chip" + (mine ? " on" : "")}
            onClick={() => setMine(true)}
          >
            My tasks
            <span className="c">
              {tasks.filter((t) => t.assignee?.id === currentUserId).length}
            </span>
          </button>
        </div>
      </div>

      <div className="taskacc">
        {TASK_STATUS_ORDER.map((st) => {
          const group = tasks.filter(
            (t) =>
              t.status === st &&
              (!mine || t.assignee?.id === currentUserId),
          );
          const s = TASK_STATUS[st];
          const isOpen = !!openSec[st];
          return (
            <div className={"accsec" + (isOpen ? " open" : "")} key={st}>
              <button
                type="button"
                className="acchead"
                onClick={() => toggle(st)}
                aria-expanded={isOpen}
              >
                <span className="dot" style={{ background: s.dot }} />
                <span className="fw6">{s.label}</span>
                <span className="muted-sm tnum">{group.length}</span>
                <ChevronDown className="accchev" />
              </button>
              <div className="accpanel">
                <div className="accpanel-inner">
                  {group.length === 0 && !canManage ? (
                    <p className="accempty">No tasks here.</p>
                  ) : (
                    <div className="acccards">
                      {group.map((t) => (
                        <KanbanCard
                          key={t.id}
                          task={t}
                          projectId={project.id}
                          attachments={attachmentsByTask[t.id] ?? []}
                          comments={commentsByTask[t.id] ?? []}
                          assignees={team}
                          currentUserId={currentUserId}
                          currentUserRole={currentUserRole}
                          canManage={canManage}
                          canWork={
                            canManage ||
                            currentUserRole === "developer" ||
                            t.assignee?.id === currentUserId
                          }
                        />
                      ))}
                      {canManage && (
                        <button
                          className="kadd"
                          onClick={() => setAddOpen(true)}
                        >
                          <Icon d="plus" size={14} />
                          Add task
                        </button>
                      )}
                    </div>
                  )}
                </div>
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
