# AgencyOS - Permissions Model

Access is enforced by **Postgres Row-Level Security (RLS)** in Supabase, not just
hidden in the UI. The database is the real guard: even a crafted API call only
returns what the signed-in user is allowed to see. The UI helpers in
`lib/permissions.ts` mirror these rules so people only see controls they can use.

## Roles

- **Staff** = `ceo`, `pa`, `admin`, with broad management access.
- **Developer** = can work on every task across every project.
- **Designer / Copywriter** = can work only on tasks assigned to them.

## Currently Enforced

| Capability | CEO | PA | Admin | Developer | Designer / Copywriter |
|---|:--:|:--:|:--:|:--:|:--:|
| See all projects and clients | yes | yes | yes | yes | no - only assigned projects |
| See tasks | all | all | all | all | assigned/project tasks only |
| Create / edit clients | yes | yes | yes | no | no |
| Create / edit projects | yes | yes | yes | no | no |
| Create and assign tasks | yes | yes | yes | no | no |
| Edit task title / description / assignee | yes | yes | yes | no | no |
| Start / upload / complete any task | no | no | no | yes | no |
| Start / upload / complete assigned task | yes, if assigned | yes, if assigned | yes, if assigned | yes | yes |
| Upload files / comment on non-assigned task | no | no | no | yes | no |
| View stored credentials | yes | yes | yes | no | no |
| Add team members | yes | yes | yes | no | no |
| Mark live | yes | no | yes | no | no |
| Activity / monitoring feed | yes | yes | yes | no | no |
| See the team roster | yes | yes | yes | yes | yes |

## Key Guarantees

- If PA assigns a design task to a designer, only that designer and developers
  can work on that task.
- Developers can work on every task, regardless of category or assignee.
- PA/admin/CEO can create, assign, edit, and monitor tasks, but they do not get
  worker controls unless they are assigned to that task.
- Attachment uploads, comments, and task status updates follow the same
  assignee-or-developer rule.
- WordPress and hosting credentials are hidden from all contributors.

## Implementation Notes

- `0002_credentials_perms.sql` is overridden by `0003_readonly_ceo_storage_scope.sql`
  so credentials are available to all staff, including CEO.
- `0003_readonly_ceo_storage_scope.sql` scopes storage object access to the
  related task while preserving staff operational access.
- `0006_task_worker_permissions.sql` enforces the assignee-or-developer work
  rule for direct database/API access.
