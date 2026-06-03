import { ThemeToggle } from "@/components/theme-toggle";
import { SearchInput } from "@/components/search/search-context";

export function PageHeader({
  eyebrow,
  title,
  search,
  children,
}: {
  eyebrow?: string;
  title: string;
  search?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="topbar">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="title">{title}</h1>
      </div>
      <div className="top-actions">
        {search && <SearchInput placeholder={search} />}
        <ThemeToggle />
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1.5px dashed var(--line-2)",
        borderRadius: "var(--radius)",
        padding: "56px 24px",
        textAlign: "center",
      }}
    >
      <p className="fw6" style={{ fontSize: 15 }}>
        {title}
      </p>
      {description && (
        <p className="muted-sm" style={{ marginTop: 6, maxWidth: 360, marginInline: "auto" }}>
          {description}
        </p>
      )}
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}
