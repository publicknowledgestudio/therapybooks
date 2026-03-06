"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CircleNotch, LinkSimple } from "@/components/ui/icons";
import { toast } from "sonner";

type BookingLinkProps = {
  bookingSlug: string | null;
  userName: string | null;
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BookingLink({ bookingSlug, userName }: BookingLinkProps) {
  const defaultSlug = bookingSlug || (userName ? generateSlug(userName) : "");
  const [slug, setSlug] = useState(defaultSlug);
  const [saving, setSaving] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullUrl = `${origin}/book/${slug}`;

  async function handleSaveSlug() {
    if (!slug.trim()) {
      toast.error("Booking slug cannot be empty");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_slug: slug }),
    });

    if (!res.ok) {
      toast.error("Failed to save booking link");
      setSaving(false);
      return;
    }

    setSaving(false);
    toast.success("Booking link saved");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Booking link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LinkSimple className="size-4" />
        <span className="font-mono text-xs break-all">{fullUrl}</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-slug">Booking slug</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            /book/
          </span>
          <Input
            id="booking-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="your-name"
            className="max-w-[200px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          disabled={!slug}
        >
          <Copy className="size-4" />
          Copy Link
        </Button>
        <Button size="sm" onClick={handleSaveSlug} disabled={saving || !slug}>
          {saving && <CircleNotch className="size-4 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
