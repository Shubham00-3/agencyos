"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/icon";

function subscribeTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  window.addEventListener("storage", callback);

  return () => {
    observer.disconnect();
    window.removeEventListener("storage", callback);
  };
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerThemeSnapshot() {
  return false;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  function toggle() {
    const next = !dark;
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
