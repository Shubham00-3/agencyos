import Link from "next/link";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";

export function DetailUnavailable({
  eyebrow,
  title,
  message,
  backHref,
  backLabel,
  error,
}: {
  eyebrow: string;
  title: string;
  message: string;
  backHref: string;
  backLabel: string;
  error?: string | null;
}) {
  return (
    <div className="detail-top">
      <div className="detail-util">
        <ThemeToggle />
      </div>

      <Link href={backHref} className="crumb">
        <Icon d="back" size={16} />
        {backLabel}
      </Link>

      <div className="panel-card pad" style={{ maxWidth: 680 }}>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="title" style={{ marginTop: 8 }}>
          {title}
        </h1>
        <p className="muted-sm" style={{ marginTop: 8, lineHeight: 1.6 }}>
          {message}
        </p>
        {error && (
          <div className="kv-row no-b" style={{ marginTop: 16 }}>
            <span className="meta-l">Database response</span>
            <span className="fw6" style={{ overflowWrap: "anywhere" }}>
              {error}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
