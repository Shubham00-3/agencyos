// Domain types mirroring the Postgres schema (supabase/migrations/0001_init.sql).

export type UserRole =
  | "ceo"
  | "pa"
  | "designer"
  | "developer"
  | "copywriter"
  | "admin";

export type ClientStatus = "active" | "completed";

export type ProjectStatus =
  | "not_started"
  | "in_progress"
  | "in_review"
  | "completed"
  | "live";

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";

export type TaskCategory = "design" | "dev" | "content" | "general";

export type CredentialKind = "wordpress" | "hosting" | "other";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_color: string;
  created_at: string;
}

export interface Client {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  existing_website_url: string | null;
  status: ClientStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ClientCredential {
  id: string;
  client_id: string;
  kind: CredentialKind;
  label: string;
  url: string | null;
  username: string | null;
  password: string | null;
  notes: string | null;
  created_at: string;
}

export interface ProjectBrief {
  competitors?: string;
  seo_keywords?: string;
  color_preferences?: string;
  desired_pages?: string;
  reference_sites?: string;
  extra_notes?: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  brief: ProjectBrief | null;
  created_by: string | null;
  live_at: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  assignee_id: string | null;
  status: TaskStatus;
  due_date: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string | null;
  body: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

// Convenience joined shapes used by the UI.
export interface TaskWithRefs extends Task {
  assignee?: Profile | null;
  project?: Pick<Project, "id" | "name" | "status" | "client_id"> | null;
}

export interface ProjectWithClient extends Project {
  client?: Pick<Client, "id" | "business_name" | "status"> | null;
  task_count?: number;
}
