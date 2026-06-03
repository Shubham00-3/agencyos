"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

export function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    typeof document === "undefined"
      ? false
      : document.documentElement.classList.contains("dark"),
  );

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button className="iconbtn" title="Toggle theme" onClick={toggle} type="button">
      <Icon d={dark ? "sun" : "moon"} />
    </button>
  );
}
