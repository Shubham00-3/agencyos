"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";

const SearchCtx = createContext<{ q: string; setQ: (s: string) => void }>({
  q: "",
  setQ: () => {},
});

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <SearchStateProvider key={pathname}>{children}</SearchStateProvider>
  );
}

function SearchStateProvider({ children }: { children: React.ReactNode }) {
  const [q, setQ] = useState("");
  return <SearchCtx.Provider value={{ q, setQ }}>{children}</SearchCtx.Provider>;
}

export function useSearch() {
  return useContext(SearchCtx);
}

// Helper: does a record match the current query across the given fields.
export function matches(q: string, ...fields: (string | null | undefined)[]) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(needle));
}

export function SearchInput({ placeholder }: { placeholder: string }) {
  const { q, setQ } = useSearch();
  return (
    <div className="search">
      <Icon d="search" />
      <input
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </div>
  );
}
