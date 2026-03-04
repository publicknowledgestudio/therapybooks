"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sidebar, MobileNav } from "./sidebar";

const STORAGE_KEY = "sidebar-collapsed";

export function DashboardShell({
  badges,
  children,
}: {
  badges?: Record<string, number>;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEY, String(!prev));
      return !prev;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar badges={badges} collapsed={collapsed} onToggle={toggle} />
      <div
        className={cn(
          "transition-[padding] duration-200",
          collapsed ? "md:pl-16" : "md:pl-60"
        )}
      >
        <MobileNav badges={badges} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
