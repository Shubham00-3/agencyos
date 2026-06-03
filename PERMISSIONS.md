# AgencyOS - Permissions Model

Access is enforced by **Postgres Row-Level Security (RLS)** in Supabase, not just
hidden in the UI. The database is the real guard: even a crafted API call only
returns what the signed-in user is allowed to see. The UI helpers in
`lib/permissions.ts` mirror these rules so people only see controls they can use.

## Roles

- **Staff** = `ceo`, `pa`, `admin`, with broad operational access.
- **Contributors** = `designer`, `developer`, `copywriter`, scoped to their work.

## Currently Enforced

| Capability | CEO | PA | Admin | Designer / Dev / Copywriter |
|---|:--:|:--:|:--:|:--:|
| See all projects and clients | yes | yes | yes | no - only projects they are a member of |
| See tasks | all | all | all | all tasks on their projects |
| Create / edit clients | yes | yes | yes | no |
| Create / edit projects | yes | yes | yes | no |
| Create and assign tasks | yes | yes | yes | no |
| Update a task status | any | any | any | only tasks assigned to them |
| Upload files / comment | yes | yes | yes | yes, on their projects |
| View stored credentials | yes | yes | yes | no |
| Add team members | yes | yes | yes | no |
| Mark live | yes | no | yes | no |
| Activity / monitoring feed | yes | yes | yes | no |
| See the team roster | yes | yes | yes | yes |

## Key Guarantees

- A contributor cannot see clients, projects, tasks, files, or comments for
  projects they are not assigned to.
- WordPress and hosting credentials are hidden from all contributors.
- CEO, PA, and Admin have operational write access.
- System Admin and CEO can mark a site live.
- Attachment storage is scoped to related task/project access.

## Implementation Notes

- `0002_credentials_perms.sql` is overridden by `0003_readonly_ceo_storage_scope.sql`
  so credentials are available to all staff, including CEO.
- `0003_readonly_ceo_storage_scope.sql` scopes storage object access to the
  related task while preserving staff operational access.
