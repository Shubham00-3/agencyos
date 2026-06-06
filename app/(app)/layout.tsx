import { requireProfile } from "@/lib/auth";
import { navForRole } from "@/lib/permissions";
import { DEMO_MODE } from "@/lib/demo";
import { Rail } from "@/components/app-shell/rail";
import { SearchProvider } from "@/components/search/search-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const nav = navForRole(profile.role);
  const demoMode = DEMO_MODE;

  return (
    <div className="app">
      <Rail profile={profile} nav={nav} demoMode={demoMode} />
      <SearchProvider>
        <main className="main">{children}</main>
      </SearchProvider>
    </div>
  );
}
