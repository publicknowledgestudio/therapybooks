"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CalendarBlank, CircleNotch, SignOut } from "@/components/ui/icons";
import { toast } from "sonner";

type GoogleConnectionProps = {
  googleCalendarId: string | null;
  outboundSyncEnabled: boolean;
};

export function GoogleConnection({
  googleCalendarId: initialCalendarId,
  outboundSyncEnabled: initialOutboundSync,
}: GoogleConnectionProps) {
  const supabase = createClient();
  const [calendarId, setCalendarId] = useState(initialCalendarId);
  const [outboundSync, setOutboundSync] = useState(initialOutboundSync);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = !!calendarId;

  async function handleConnect() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/settings`,
        scopes:
          "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts.readonly",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      toast.error("Failed to connect Google account");
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      if (!res.ok) {
        throw new Error("Sync failed");
      }
      const data = await res.json();
      toast.success(
        `Synced ${data.synced ?? 0} event${(data.synced ?? 0) !== 1 ? "s" : ""}`
      );
    } catch {
      toast.error("Failed to sync calendar");
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleOutboundSync(checked: boolean) {
    setOutboundSync(checked);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outbound_sync_enabled: checked }),
    });

    if (!res.ok) {
      setOutboundSync(!checked);
      toast.error("Failed to update sync setting");
      return;
    }

    toast.success(checked ? "Outbound sync enabled" : "Outbound sync disabled");
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        google_calendar_id: null,
        google_refresh_token: null,
      }),
    });

    if (!res.ok) {
      toast.error("Failed to disconnect");
      setDisconnecting(false);
      return;
    }

    setCalendarId(null);
    setDisconnecting(false);
    toast.success("Google Calendar disconnected");
  }

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Not connected</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Connect your Google account to sync sessions with Google Calendar.
        </p>
        <Button size="sm" onClick={handleConnect}>
          <CalendarBlank className="size-4" />
          Connect Google Account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Connected
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarBlank className="size-4" />
        <span>{calendarId}</span>
      </div>

      <div className="flex items-center gap-4">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing && <CircleNotch className="size-4 animate-spin" />}
          Sync Now
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleDisconnect}
          disabled={disconnecting}
        >
          {disconnecting ? (
            <CircleNotch className="size-4 animate-spin" />
          ) : (
            <SignOut className="size-4" />
          )}
          Disconnect
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="outbound-sync"
          checked={outboundSync}
          onCheckedChange={handleToggleOutboundSync}
        />
        <Label htmlFor="outbound-sync" className="text-sm font-normal">
          Push new sessions to Google Calendar
        </Label>
      </div>
    </div>
  );
}
