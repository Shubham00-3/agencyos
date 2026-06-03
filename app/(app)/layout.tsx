import { requireProfile } from "@/lib/auth";
import { navForRole } from "@/lib/permissions";
import { Rail } from "@/components/app-shell/rail";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const nav = navForRole(profile.role);
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <div className="app">
      <Rail profile={profile} nav={nav} demoMode={demoMode} />
      <main className="main">{children}</main>
    </div>
  );
}
