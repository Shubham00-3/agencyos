import { initials } from "@/lib/constants";
import { Icon } from "@/components/icon";

// Deterministic colour for a client logo from its name (clients have no
// stored colour). Mirrors the warm palette used in the reference.
const LOGO_COLORS = [
  "#b5673c",
  "#2f7d8a",
  "#5a57e0",
  "#2f8a5b",
  "#c0503c",
  "#a85a86",
  "#b0843a",
  "#4f8a4a",
];
export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LOGO_COLORS[h % LOGO_COLORS.length];
}

export function ClientLogo({
  name,
  size = 30,
  radius = 9,
}: {
  name: string;
  size?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: colorForName(name),
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize: size * 0.42,
        flex: "none",
      }}
    >
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function PersonAvatar({
  name,
  color = "#5a57e0",
  size = 28,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize: size * 0.36,
        flex: "none",
      }}
    >
      {initials(name)}
    </div>
  );
}

export function AvatarStack({
  people,
  size = 25,
}: {
  people: { name: string; color?: string }[];
  size?: number;
}) {
  if (!people || people.length === 0)
    return <span className="muted-sm">Unassigned</span>;
  return (
    <div className="avstack">
      {people.map((m, i) => (
        <div
          key={i}
          className="a"
          title={m.name}
          style={{
            background: m.color || "#5a57e0",
            width: size,
            height: size,
            fontSize: size * 0.38,
          }}
        >
          {initials(m.name)}
        </div>
      ))}
    </div>
  );
}

export function Progress({ value, live }: { value: number; live?: boolean }) {
  return (
    <div>
      <div className="prog-row">
        <span>Progress</span>
        <span className="tnum">{value}%</span>
      </div>
      <div className="bar">
        <i
          style={{
            width: value + "%",
            background: live ? "var(--green)" : "var(--brand)",
          }}
        />
      </div>
    </div>
  );
}

export function Due({ value, over }: { value: string; over?: boolean }) {
  return (
    <span className={"due" + (over ? " over" : "")}>
      <Icon d="cal" />
      {value}
    </span>
  );
}
