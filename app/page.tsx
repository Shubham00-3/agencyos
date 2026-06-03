import { redirect } from "next/navigation";

// Middleware sends unauthenticated users to /login; everyone else lands here.
export default function Home() {
  redirect("/dashboard");
}
