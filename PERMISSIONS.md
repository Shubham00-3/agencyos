# AgencyOS — Permissions Model

Access is enforced by **Postgres Row-Level Security (RLS)** in Supabase, not just
hidden in the UI. The database is the real guard — even a crafted API call only
returns what the signed-in user is allowed to see. The UI helpers in
`lib/permissions.ts` mirror these rules so people only see controls they can use.

## Roles

- **Staff** = `ceo`, `pa`, `admin` — broad visibility.
- **Contributors** = `designer`, `developer`, `copywriter` — scoped to their work.

## Currently enforced (today)

| Capability | CEO | PA | Admin | Designer / Dev / Copywriter |
|---|:--:|:--:|:--:|:--:|
| See **all** projects & clients | ✅ | ✅ | ✅ | ❌ — only projects they're a **member** of |
| See tasks | all | all | all | all tasks **on their projects** |
| Create / edit clients | ✅ | ✅ | ✅ | ❌ |
| Create / edit projects | ✅ | ✅ | ✅ | ❌ |
| Create & assign tasks | ✅ | ✅ | ✅ | ❌ |
| Update a task's status | any | any | any | **only tasks assigned to them** |
| Upload files / comment | ✅ | ✅ | ✅ | ✅ on their projects |
| View stored **credentials** | ✅ | ✅ | ✅ | ❌ |
| Add team members (logins) | ❌ | ✅ | ✅ | ❌ |
| "Mark live" | ❌ | ❌ | ✅ | ❌ |
| Activity / monitoring feed | ✅ | ✅ | ✅ | ❌ |
| See the team roster | ✅ | ✅ | ✅ | ✅ |

Key guarantees already in place:
- A contributor **cannot** see clients, projects, tasks, files or comments for
  projects they're not assigned to.
- **Credentials** (WordPress / hosting passwords) are hidden from all
  contributors.
- Contributors can only **change the status of their own** tasks.

## Proposed tightening ("not everyone should see everything")

Two policy changes worth making — both are judgement calls for you/your manager:

1. **CEO becomes read-only.**
   Today the CEO can edit clients/projects/tasks. The CEO's job is oversight, so
   restrict to **view + their own tasks**; remove create/edit of others' work.

2. **Credentials limited to PA + System Admin only** (remove CEO).
   System passwords are sensitive; the CEO doesn't need them. The admin holds
   them, the PA manages them.

Optional, stricter (only if you want it):

3. **Contributors see only their *assigned* tasks**, not the whole project board.
   *Not recommended* — seeing the board is what makes the team collaborate, which
   was the whole point. Listed for completeness.

### What implementing #1 and #2 touches
- New migration `0002_permissions.sql`: add a `can_write()` helper
  (`role in ('pa','admin')`); swap it into the write policies for
  `clients` / `projects` / `tasks`; change the `client_credentials` policy from
  `is_staff()` to `can_write()`. CEO keeps read access via the existing `select`
  policies.
- `lib/permissions.ts`: `manageClients/Projects/Tasks` and `viewCredentials`
  → PA + Admin only. (`seeOverview` stays true for CEO.)
- UI automatically hides "New project / Add client / Add task / status controls /
  credentials" for the CEO since it reads those helpers.

Once you confirm the policy, this is a ~1 migration + small UI pass.
