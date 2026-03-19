"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CircleNotch, Clock } from "@/components/ui/icons";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CalendarSyncBarProps {
  lastSyncedAt: string | null;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function CalendarSyncBar({ lastSyncedAt }: CalendarSyncBarProps) {
  const router = useRouter();
  const [isSyncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Sync failed");
      }
      const data = await res.json();
      const created = data.created ?? 0;
      const skipped = data.skipped ?? 0;
      const unmatched = data.unmatched ?? 0;
      const parts = [`${created} new`];
      if (skipped > 0) parts.push(`${skipped} skipped`);
      if (unmatched > 0) parts.push(`${unmatched} unmatched`);
      toast.success(`Calendar sync: ${parts.join(", ")}`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to sync calendar"
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {lastSyncedAt
          ? `Last synced ${formatRelativeTime(lastSyncedAt)}`
          : "Never synced"}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSync}
        disabled={isSyncing}
        className="h-7 text-xs"
      >
        {isSyncing && (
          <CircleNotch className="mr-1.5 h-3 w-3 animate-spin" />
        )}
        {isSyncing ? "Syncing..." : "Sync Now"}
      </Button>
    </div>
  );
}
