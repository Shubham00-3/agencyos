import type { UserRole } from "./types";
import { isStaff, isManager } from "./constants";

// UI-level permission helpers. These mirror the database RLS policies so the
// interface only shows what a role can actually do — the DB is the real guard.
//
// Read vs write: the CEO is read-only. `isStaff` (ceo/pa/admin) grants full
// VISIBILITY; `isManager` (pa/admin) grants the ability to CHANGE things.

export const can = {
  // Clients / projects: create, edit, delete.
  manageClients: (role: UserRole) => isManager(role),
  manageProjects: (role: UserRole) => isManager(role),
  // Create + assign tasks to anyone.
  manageTasks: (role: UserRole) => isManager(role),
  // View stored WordPress / hosting credentials (read). CEO/PA/Admin.
  viewCredentials: (role: UserRole) => isStaff(role),
  // Add / edit / delete stored credentials (write). Not the CEO.
  manageCredentials: (role: UserRole) => isManager(role),
  // Add / manage team members (auth accounts).
  manageTeam: (role: UserRole) => isManager(role),
  // Flip a project to "live" — System Admin only.
  markLive: (role: UserRole) => role === "admin",
  // See the CEO-style portfolio overview on the dashboard.
  seeOverview: (role: UserRole) => isStaff(role),
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
