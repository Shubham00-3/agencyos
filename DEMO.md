# AgencyOS — Demo Guide

Internal workspace for the agency: clients, website projects, tasks, files and
credentials in one place, with role-based access. Lead-gen/sales stay in
GoHighLevel — this system starts **after a deal closes**.

## Run it locally

```bash
# Production mode (fast, recommended for demos)
npm run build
npm start            # http://localhost:3000

# Dev mode (hot reload, slower first click)
npm run dev
```

Requires `.env.local` (see `.env.local.example`) pointing at the cloud Supabase
project. Light/dark theme toggle is the sun/moon button in each page header.

## Demo accounts

All accounts use the password **`password123`**.

| Role | Email | Sees |
|------|-------|------|
| CEO | `ceo@agencyos.test` | High-level overview of all projects (read-only) |
| Personal Assistant | `pa@agencyos.test` | Everything — runs day-to-day operations |
| Designer | `designer@agencyos.test` | Only their assigned projects + tasks; uploads files |
| Developer | `developer@agencyos.test` | Same, their work |
| Copywriter | `copywriter@agencyos.test` | Same, their work |
| System Admin | `admin@agencyos.test` | Full access + credentials + "Mark live" |

**Switch roles fast:** click the **avatar at the bottom of the left rail** →
"Demo · view as" → pick a role. (Demo mode only.)

## Walkthrough script (≈5 min)

1. **Frame the problem.** "The issue isn't building sites — it's coordination.
   This is one workspace where every build lives, role-based so each person sees
   only what they need."
2. **CEO** — the Studio board: KPI cards + project cards with live progress.
   "Your 10,000-ft view; you watch, you don't manage tasks."
3. **PA** — open a client (e.g. Greenleaf) → show the **credential vault**
   (WordPress + hosting). Open a project → **Brief** (competitors, SEO, colours)
   → **Add task**, assign to the designer.
4. **Designer** — only their project shows. Open a task → **upload a file** →
   move to **In review** → leave a **comment**. (No credentials tab for them.)
5. **Back to PA/CEO** — the dashboard **Recent activity** feed and the "In
   review" count update. "Accountability without asking anyone."
6. **System Admin** — open a project → **Mark live**. Logged and done.

## What's intentionally out of scope

- Lead capture / sales / ads → lives in GoHighLevel.
- This is the build-and-delivery workspace only.

See `PERMISSIONS.md` for the full role-access model.
