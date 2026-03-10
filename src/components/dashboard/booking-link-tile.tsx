"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  LinkSimple,
  Copy,
  PencilSimple,
  CircleNotch,
  ArrowSquareOut,
} from "@/components/ui/icons";
import { toast } from "sonner";

interface BookingLinkTileProps {
  bookingSlug: string | null;
  userName: string | null;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BookingLinkTile({ bookingSlug, userName }: BookingLinkTileProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [slug, setSlug] = useState(bookingSlug ?? "");
  const [saving, setSaving] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const currentSlug = bookingSlug ?? "";
  const fullUrl = currentSlug ? `${origin}/book/${currentSlug}` : "";

  async function handleCopy() {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Booking link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }

  function openEditDialog() {
    setSlug(bookingSlug ?? (userName ? generateSlug(userName) : ""));
    setDialogOpen(true);
  }

  async function handleSave() {
    const trimmed = slug.trim();
    if (!trimmed) {
      toast.error("Booking slug cannot be empty");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_slug: trimmed }),
    });

    if (!res.ok) {
      toast.error("Failed to save booking link");
      setSaving(false);
      return;
    }

    setSaving(false);
    setDialogOpen(false);
    toast.success("Booking link saved — reload to see changes");
  }

  // No slug set yet
  if (!currentSlug) {
    return (
      <>
        <div className="rounded-lg border border-dashed border-border p-5">
          <div className="flex items-center gap-2">
            <LinkSimple className="size-4 text-muted-foreground" weight="regular" />
            <p className="text-sm font-medium text-foreground">Booking Link</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Set up a public booking page so clients can schedule appointments with you.
          </p>
          <Button size="sm" className="mt-3" onClick={openEditDialog}>
            Set up booking link
          </Button>
        </div>

        <EditSlugDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          slug={slug}
          setSlug={setSlug}
          saving={saving}
          onSave={handleSave}
          origin={origin}
        />
      </>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkSimple className="size-4 text-muted-foreground" weight="regular" />
            <p className="text-sm font-medium text-foreground">Booking Link</p>
          </div>
          <button
            type="button"
            onClick={openEditDialog}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Edit booking link"
          >
            <PencilSimple className="size-3.5" />
          </button>
        </div>

        <p className="mt-2 font-mono text-xs text-muted-foreground break-all">
          {origin}/book/{currentSlug}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="size-3.5" />
            Copy Link
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(`/book/${currentSlug}`, "_blank")}
          >
            <ArrowSquareOut className="size-3.5" />
            Open
          </Button>
        </div>
      </div>

      <EditSlugDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        slug={slug}
        setSlug={setSlug}
        saving={saving}
        onSave={handleSave}
        origin={origin}
      />
    </>
  );
}

function EditSlugDialog({
  open,
  onOpenChange,
  slug,
  setSlug,
  saving,
  onSave,
  origin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  setSlug: (slug: string) => void;
  saving: boolean;
  onSave: () => void;
  origin: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Booking Link</DialogTitle>
          <DialogDescription>
            Customise the URL clients use to book appointments with you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label htmlFor="edit-slug">Booking slug</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              /book/
            </span>
            <Input
              id="edit-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="your-name"
            />
          </div>
          <p className="text-xs text-muted-foreground break-all">
            {origin}/book/{slug || "your-name"}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || !slug.trim()}>
            {saving && <CircleNotch className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
