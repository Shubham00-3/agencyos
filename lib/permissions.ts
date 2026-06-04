import type { UserRole } from "./types";
import { isStaff } from "./constants";

// UI-level permission helpers. These mirror the database RLS policies so the
// interface only shows what a role can actually do — the DB is the real guard.

export const can = {
  // Clients / projects: create, edit, delete.
  manageClients: (role: UserRole) => isStaff(role),
  manageProjects: (role: UserRole) => isStaff(role),
  // Create + assign tasks to anyone.
  manageTasks: (role: UserRole) => isStaff(role),
  // View and edit stored WordPress / hosting credentials.
  // Tightened: PA (who enters them) + System Admin (who goes live) only —
  // not the CEO. Least-privilege for secrets.
  viewCredentials: (role: UserRole) => isStaff(role),
  // Add / manage team members (auth accounts).
  manageTeam: (role: UserRole) => isStaff(role),
  // Flip a project to "live".
  markLive: (role: UserRole) => role === "ceo" || role === "admin",
  // See the CEO-style portfolio overview on the dashboard.
  seeOverview: (role: UserRole) => role === "ceo" || isStaff(role),
  // Full task visibility without task-management controls.
  seeAllTasks: (role: UserRole) => isStaff(role) || role === "developer",
};

export type NavItem = {
  href: string;
  label: string;
  icon: string; // lucide icon name
};

// Sidebar entries, filtered per role. Contributors get a focused set.
export function navForRole(role: UserRole): NavItem[] {
  const all: (NavItem & { roles?: UserRole[] })[] = [
    { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    {
      href: "/clients",
      label: "Clients",
      icon: "Building2",
      roles: ["ceo", "pa", "admin"],
    },
    { href: "/projects", label: "Projects", icon: "FolderKanban" },
    { href: "/tasks", label: "My Tasks", icon: "CheckSquare" },
    { href: "/team", label: "Team", icon: "Users" },
  ];

  return all.filter((item) => !item.roles || item.roles.includes(role));
}
