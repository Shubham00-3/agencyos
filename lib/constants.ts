import type {
  ClientStatus,
  LifecycleKind,
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

// "Staff" = full management access over clients, projects, tasks and credentials.
export const STAFF_ROLES: UserRole[] = ["ceo", "pa", "admin"];
// Contributors do project work. Developers have full task visibility; designers
// and copywriters only see assigned tasks.
export const CONTRIBUTOR_ROLES: UserRole[] = [
  "designer",
  "developer",
  "copywriter",
];

export function isStaff(role: UserRole | undefined | null): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

// Managers can make changes (create / edit / delete / assign / approve). The
// CEO is intentionally NOT a manager: full read access, but read-only — they
// can see everything and change nothing.
export const MANAGER_ROLES: UserRole[] = ["pa", "admin"];
export function isManager(role: UserRole | undefined | null): boolean {
  return !!role && MANAGER_ROLES.includes(role);
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
  todo: { label: "Pending", cls: "b-todo", dot: "var(--ink-3)" },
  in_progress: { label: "In progress", cls: "b-prog", dot: "var(--brand)" },
  uploaded: { label: "Uploaded", cls: "b-rev", dot: "var(--amber)" },
  in_review: { label: "In review", cls: "b-rev", dot: "var(--amber)" },
  done: { label: "Completed", cls: "b-live", dot: "var(--green)" },
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "done",
];

// Predefined project types for the new-project dropdown. "Other" reveals a
// free-text field so the user can specify a type that isn't listed here.
export const PROJECT_TYPES = [
  "New Website",
  "Redesigning",
  "SEO",
  "E-commerce",
  "Facebook Ads",
  "Google Ads",
  "Social Media Marketing",
] as const;

export const PROJECT_TYPE_OTHER = "Other";

// New vs old (returning) flag, shared by clients and projects.
export const LIFECYCLE_LABEL: Record<LifecycleKind, string> = {
  new: "New",
  old: "Old",
};

export const MAX_WEB_ARCHIVE_LINKS = 5;

// ---- Communications (call recordings + transcription) --------------------
// Language hint chosen at record time, mapped to Sarvam saaras:v3 params.
// Client calls should be readable by the full internal team, so every non-
// English recording uses translate mode and stores the transcript in English.
export type CommLanguageHint = {
  value: string;
  label: string;
  languageCode: string;
  mode: "transcribe" | "translate" | "codemix";
};

export const COMM_LANGUAGES: CommLanguageHint[] = [
  { value: "auto", label: "Auto-detect", languageCode: "unknown", mode: "translate" },
  { value: "pa-IN", label: "Punjabi", languageCode: "pa-IN", mode: "translate" },
  { value: "hi-IN", label: "Hindi", languageCode: "hi-IN", mode: "translate" },
  { value: "en-IN", label: "English", languageCode: "en-IN", mode: "transcribe" },
  { value: "code-mixed", label: "Code-mixed", languageCode: "unknown", mode: "translate" },
];

export const COMM_LANGUAGE_LABEL: Record<string, string> = Object.fromEntries(
  COMM_LANGUAGES.map((l) => [l.value, l.label]),
);

export const TRANSCRIPT_STATUS_LABEL: Record<string, string> = {
  none: "No transcript",
  processing: "Transcribing…",
  done: "Transcribed",
  failed: "Transcription failed",
};

// Keep the Server Action that starts Sarvam jobs comfortably below common
// serverless memory/time limits. 50 MB is about 26 minutes of 16 kHz mono WAV.
export const MAX_TRANSCRIPTION_AUDIO_BYTES = 50 * 1024 * 1024;

// Joins the location parts into "City, Province, Country", skipping blanks.
export function formatLocation(parts: {
  city?: string | null;
  province?: string | null;
  country?: string | null;
}): string {
  return [parts.city, parts.province, parts.country]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
}

// The fixed website build pipeline. "Generate standard workflow" on a project
// creates one task per step, in this order, each assignable to a team member.
export const WEBSITE_WORKFLOW: {
  stage: string;
  category: TaskCategory;
  description: string;
}[] = [
  {
    stage: "Requirement Gathering",
    category: "general",
    description: "Gather requirements, access, and scope with the client.",
  },
  {
    stage: "Graphic / Design Development",
    category: "design",
    description: "Design the mockups and graphics for the site.",
  },
  {
    stage: "Content Writing",
    category: "content",
    description: "Write the page copy and content.",
  },
  {
    stage: "QA",
    category: "dev",
    description: "Quality-check the build across pages and devices.",
  },
  {
    stage: "Initial SEO Check",
    category: "general",
    description: "Initial SEO pass — meta tags, headings, indexing.",
  },
  {
    stage: "Sent for Review",
    category: "general",
    description: "Send to the client / PA for review.",
  },
  {
    stage: "Go Live",
    category: "dev",
    description: "Publish the site live.",
  },
  {
    stage: "Post-Live Check",
    category: "dev",
    description: "Post-launch checks once the site is live.",
  },
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
