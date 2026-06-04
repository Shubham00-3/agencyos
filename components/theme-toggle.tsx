"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

export function ThemeToggle() {
  // Start from a fixed value so the server and the client's first render
  // agree; sync to the real theme after mount to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

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
      <Icon d={mounted && dark ? "sun" : "moon"} />
    </button>
  );
}
