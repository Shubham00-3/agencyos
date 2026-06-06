"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/constants";
import { DEMO_MODE } from "@/lib/demo";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const demoMode = DEMO_MODE;
  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "password123";

  const [email, setEmail] = useState(demoMode ? "pa@agencyos.test" : "");
  const [password, setPassword] = useState(demoMode ? demoPassword : "");
  const [loading, setLoading] = useState(false);

  async function login(em: string, pw: string) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: em,
      password: pw,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-neutral-950 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-white/[0.03] blur-3xl" />
        <div className="relative z-10 flex items-center gap-2.5">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#fff",
              color: "#101013",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            A
          </div>
          <span className="text-xl font-semibold tracking-tight">AgencyOS</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            One workspace for every website you build.
          </h2>
          <p className="mt-4 text-white/60">
            Clients, projects, tasks, files and credentials — so the whole team
            knows exactly who&apos;s doing what, and nothing slips.
          </p>
        </div>
        <p className="relative z-10 text-sm text-white/40">Internal use only</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2.5">
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "var(--brand)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: 17,
              }}
            >
              A
            </div>
            <span className="text-lg font-semibold tracking-tight">AgencyOS</span>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome back. Enter your credentials to continue.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              login(email, password);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          {demoMode && (
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Demo — sign in as any role
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ALL_ROLES.map((r: UserRole) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={loading}
                    onClick={() => login(`${r}@agencyos.test`, demoPassword)}
                  >
                    {ROLE_LABELS[r]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
