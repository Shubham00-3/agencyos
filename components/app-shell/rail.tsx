"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ALL_ROLES, ROLE_LABELS, initials } from "@/lib/constants";
import type { Profile, UserRole } from "@/lib/types";
import type { NavItem } from "@/lib/permissions";
import { Icon } from "@/components/icon";
import { toast } from "sonner";

// Maps a route to the rail's icon + short label.
const RAIL: Record<string, { icon: string; label: string }> = {
  "/dashboard": { icon: "home", label: "Home" },
  "/clients": { icon: "clients", label: "Clients" },
  "/projects": { icon: "projects", label: "Projects" },
  "/tasks": { icon: "tasks", label: "Tasks" },
  "/team": { icon: "team", label: "Team" },
};

export function Rail({
  profile,
  nav,
  demoMode,
}: {
  profile: Profile;
  nav: NavItem[];
  demoMode: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "password123";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function switchRole(role: UserRole) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: `${role}@agencyos.test`,
      password: demoPassword,
    });
    if (error) return toast.error(error.message);
    toast.success(`Viewing as ${ROLE_LABELS[role]}`);
    setMenu(false);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <nav className="rail">
      <Link href="/dashboard" className="logo">
        A
      </Link>

      {nav.map((item) => {
        const r = RAIL[item.href];
        if (!r) return null;
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={"navlink" + (active ? " active" : "")}
          >
            <Icon d={r.icon} />
            <span>{r.label}</span>
          </Link>
        );
      })}

      <div className="grow" />

      <div style={{ position: "relative" }}>
        <button
          className="meav"
          style={{ background: profile.avatar_color }}
          title={`${profile.full_name} · ${ROLE_LABELS[profile.role]}`}
          onClick={() => setMenu((m) => !m)}
        >
          {initials(profile.full_name)}
        </button>

        {menu && (
          <>
            <div
              onClick={() => setMenu(false)}
              style={{ position: "fixed", inset: 0, zIndex: 40 }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: "calc(100% + 10px)",
                zIndex: 50,
                width: 220,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                boxShadow: "var(--shadow)",
                padding: 6,
              }}
            >
              <div style={{ padding: "8px 10px" }}>
                <div className="fw6" style={{ fontSize: 13 }}>
                  {profile.full_name}
                </div>
                <div className="muted-sm">{ROLE_LABELS[profile.role]}</div>
              </div>

              {demoMode && (
                <>
                  <div
                    className="muted-sm"
                    style={{
                      padding: "6px 10px 4px",
                      textTransform: "uppercase",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: ".05em",
                    }}
                  >
                    Demo · view as
                  </div>
                  {ALL_ROLES.map((r) => (
                    <button
                      key={r}
                      className="menu-item"
                      onClick={() => switchRole(r)}
                      data-active={r === profile.role}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                  <div
                    style={{
                      height: 1,
                      background: "var(--line)",
                      margin: "6px 4px",
                    }}
                  />
                </>
              )}

              <button className="menu-item" onClick={signOut}>
                <Icon d="logout" size={15} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
