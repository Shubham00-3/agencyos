import type {
  ClientStatus,
  ProjectStatus,
  TaskCategory,
  TaskStatus,
  UserRole,
} from "./types";

// ---- Roles ---------------------------------------------------------------

export const ROLE_LABELS: Record<UserRole, string> = {
  ceo: "CEO",
  pa: "Personal Assistant",
  designer: "Designer",
  developer: "Developer",
  copywriter: "Copywriter",
  admin: "System Admin",
};

export const ROLE_SHORT: Record<UserRole, string> = {
  ceo: "CEO",
  pa: "PA",
  designer: "Design",
  developer: "Dev",
  copywriter: "Copy",
  admin: "Admin",
};

export const ALL_ROLES: UserRole[] = [
  "ceo",
  "pa",
  "designer",
  "developer",
  "copywriter",
  "admin",
];

// "Staff" = full visibility over clients, projects, tasks and credentials.
export const STAFF_ROLES: UserRole[] = ["ceo", "pa", "admin"];
// Contributors only see work assigned to them on projects they belong to.
export const CONTRIBUTOR_ROLES: UserRole[] = [
  "designer",
  "developer",
  "copywriter",
];

export function isStaff(role: UserRole | undefined | null): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

// ---- Status styling ------------------------------------------------------
// Each maps to a CSS badge class (.b-prog/.b-rev/.b-live/.b-todo) + a dot colour
// from the design system (see globals.css).
type StatusStyle = { label: string; cls: string; dot: string };

export const PROJECT_STATUS: Record<ProjectStatus, StatusStyle> = {
  not_started: { label: "Not started", cls: "b-todo", dot: "var(--ink-3)" },
  in_progress: { label: "In progress", cls: "b-prog", dot: "var(--brand)" },
  in_review: { label: "In review", cls: "b-rev", dot: "var(--amber)" },
  completed: { label: "Completed", cls: "b-live", dot: "var(--green)" },
  live: { label: "Live", cls: "b-live", dot: "var(--green)" },
};

export const CLIENT_STATUS: Record<ClientStatus, StatusStyle> = {
  active: { label: "Active", cls: "b-live", dot: "var(--green)" },
  completed: { label: "Completed", cls: "b-todo", dot: "var(--ink-3)" },
};

export const TASK_STATUS: Record<TaskStatus, StatusStyle> = {
  todo: { label: "To do", cls: "b-todo", dot: "var(--ink-3)" },
  in_progress: { label: "In progress", cls: "b-prog", dot: "var(--brand)" },
  in_review: { label: "In review", cls: "b-rev", dot: "var(--amber)" },
  done: { label: "Done", cls: "b-live", dot: "var(--green)" },
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "done",
];

export const TASK_CATEGORY: Record<TaskCategory, { label: string }> = {
  design: { label: "Design" },
  dev: { label: "Dev" },
  content: { label: "Content" },
  general: { label: "General" },
};

// Which task category each contributor role naturally owns (used to default
// the assignee dropdown and to label work). Staff can assign any category.
export const ROLE_DEFAULT_CATEGORY: Partial<Record<UserRole, TaskCategory>> = {
  designer: "design",
  developer: "dev",
  copywriter: "content",
};

// Avatar palette for seeded/added members.
export const AVATAR_COLORS = [
  "#6366f1",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#0ea5e9",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
