import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { getProjectsMeta } from "@/lib/projects";
import { PageHeader } from "@/components/page-header";
import { ProjectsView } from "@/components/views/projects-view";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import type { Client } from "@/lib/types";

export default async function ProjectsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const projects = await getProjectsMeta(supabase);

  let clients: Pick<Client, "id" | "business_name">[] = [];
  if (can.manageProjects(profile.role)) {
    const { data } = await supabase
      .from("clients")
      .select("id, business_name")
      .order("business_name");
    clients = (data as Pick<Client, "id" | "business_name">[]) ?? [];
  }

  return (
    <>
      <PageHeader
        eyebrow="Every active website build"
        title="Projects"
        search="Search projects…"
      >
        {can.manageProjects(profile.role) && (
          <NewProjectDialog clients={clients} />
        )}
      </PageHeader>
      <ProjectsView projects={projects} />
    </>
  );
}
