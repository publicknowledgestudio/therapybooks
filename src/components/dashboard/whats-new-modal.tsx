"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lightning } from "@/components/ui/icons";
import { dismissChangelog } from "@/app/(dashboard)/dashboard/actions";
import type { ChangelogEntry } from "@/lib/changelog";

const MAX_VISIBLE = 4;

interface WhatsNewModalProps {
  entries: ChangelogEntry[];
  latestId: string;
}

function formatEntryDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function WhatsNewModal({ entries, latestId }: WhatsNewModalProps) {
  const [open, setOpen] = useState(true);

  function handleDismiss() {
    setOpen(false);
    dismissChangelog(latestId);
  }

  if (entries.length === 0) return null;

  const visible = entries.slice(0, MAX_VISIBLE);
  const hasMore = entries.length > MAX_VISIBLE;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightning className="h-5 w-5 text-amber-500" />
            What&apos;s New
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {visible.map((entry) => (
            <div key={entry.id}>
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-medium text-foreground">
                  {entry.title}
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  {formatEntryDate(entry.date)}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {entry.description}
              </p>
            </div>
          ))}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {hasMore ? (
            <Button variant="ghost" size="sm" asChild onClick={handleDismiss}>
              <Link href="/changelog">
                Show {entries.length - MAX_VISIBLE} more...
              </Link>
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={handleDismiss}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
