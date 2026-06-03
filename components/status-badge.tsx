import {
  CLIENT_STATUS,
  PROJECT_STATUS,
  TASK_CATEGORY,
  TASK_STATUS,
} from "@/lib/constants";
import type {
  ClientStatus,
  ProjectStatus,
  TaskCategory,
  TaskStatus,
} from "@/lib/types";

function Badge({ s }: { s: { label: string; cls: string; dot: string } }) {
  return (
    <span className={"badge " + s.cls}>
      <span className="dot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge s={PROJECT_STATUS[status]} />;
}

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return <Badge s={CLIENT_STATUS[status]} />;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge s={TASK_STATUS[status]} />;
}

export function CategoryBadge({ category }: { category: TaskCategory }) {
  return <span className="catpill">{TASK_CATEGORY[category].label}</span>;
}
