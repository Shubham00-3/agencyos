import type { JSX } from "react";

// Stroke icon set ported from the design reference. Styling (stroke width,
// colour) comes from CSS so these inherit the surrounding context.
const ICONS: Record<string, JSX.Element> = {
  home: <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  clients: (
    <g>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M9 5V3h6v2" />
    </g>
  ),
  projects: (
    <g>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16M9 5v14" />
    </g>
  ),
  tasks: <path d="M5 7h14M5 12h14M5 17h9" />,
  team: (
    <g>
      <circle cx="9" cy="9" r="3" />
      <circle cx="16.5" cy="11" r="2.3" />
      <path d="M4 19c0-3 2.2-4.6 5-4.6s5 1.6 5 4.6M14.8 18.6c.2-2.2 1.6-3.2 3.4-3.2 1.8 0 3 1 3 3.2" />
    </g>
  ),
  search: (
    <g>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </g>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  sun: (
    <g>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </g>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  cal: (
    <g>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9h17M8 3v3M16 3v3" />
    </g>
  ),
  sort: <path d="M7 4v16M7 20l-3-3M7 4l3 3M17 20V4M17 4l-3 3M17 4l3 3" />,
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  dots: (
    <g>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </g>
  ),
  mail: (
    <g>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </g>
  ),
  phone: (
    <path d="M5 4h3l1.5 5-2 1.5a12 12 0 0 0 5 5l1.5-2 5 1.5V20a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
  ),
  link: (
    <g>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 7l1.5-1.5a3.5 3.5 0 0 1 5 5L16 12" />
      <path d="M13 17l-1.5 1.5a3.5 3.5 0 0 1-5-5L8 12" />
    </g>
  ),
  clip: (
    <path d="M21 11.5 12 20.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9 17a1.6 1.6 0 0 1-2.3-2.3l7.8-7.8" />
  ),
  chat: <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20.5l1.3-5.5A8 8 0 1 1 21 12z" />,
  check: <path d="M5 13l4 4L19 7" />,
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8z" />,
  ext: (
    <g>
      <path d="M14 5h5v5" />
      <path d="M19 5l-8 8" />
      <path d="M19 13v6H5V5h6" />
    </g>
  ),
  logout: (
    <g>
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </g>
  ),
  rocket: (
    <path d="M5 15c-1 1-1.5 4-1.5 4s3-.5 4-1.5M9 13l2 2M14.5 4.5c2.5-.5 5 0 5 0s.5 2.5 0 5c-.7 3.4-4 6-4 6l-3-3-3-3s2.6-3.3 6-4z" />
  ),
  selector: <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />,
  activity: <path d="M3 12h4l3 8 4-16 3 8h4" />,
  hourglass: (
    <path d="M7 3h10M7 21h10M7 3c0 4 4 5 5 6 1-1 5-2 5-6M7 21c0-4 4-5 5-6 1 1 5 2 5 6" />
  ),
  clock: (
    <g>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </g>
  ),
  doc: (
    <g>
      <path d="M6 3h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M13 3v5h5" />
    </g>
  ),
  droplet: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  note: (
    <g>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </g>
  ),
  user: (
    <g>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5.5 20c0-3.6 3-5.5 6.5-5.5s6.5 1.9 6.5 5.5" />
    </g>
  ),
  pin: (
    <g>
      <path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </g>
  ),
};

export function Icon({ d, size }: { d: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      style={size ? { width: size, height: size } : undefined}
    >
      {ICONS[d]}
    </svg>
  );
}
