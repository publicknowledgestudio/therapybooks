"use client";

import { useState, useTransition } from "react";
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

interface WhatsNewModalProps {
  entries: ChangelogEntry[];
  latestId: string;
}

export function WhatsNewModal({ entries, latestId }: WhatsNewModalProps) {
  const [open, setOpen] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleDismiss() {
    startTransition(async () => {
      await dismissChangelog(latestId);
      setOpen(false);
    });
  }

  if (entries.length === 0) return null;

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
          {entries.map((entry) => (
            <div key={entry.id}>
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-medium text-foreground">
                  {entry.title}
                </h3>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {entry.date}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {entry.description}
              </p>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={handleDismiss} disabled={isPending}>
            {isPending ? "Saving..." : "Got it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
