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
  viewCredentials: (role: UserRole) => isStaff(role),
  // Add / manage team members (auth accounts).
  manageTeam: (role: UserRole) => role === "pa" || role === "admin",
  // Flip a project to "live".
  markLive: (role: UserRole) => role === "admin",
  // See the CEO-style portfolio overview on the dashboard.
  seeOverview: (role: UserRole) => role === "ceo" || isStaff(role),
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
