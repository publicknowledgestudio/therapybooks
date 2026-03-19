"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientPicker } from "@/components/transactions/client-picker";
import { tagUnmatchedEvent } from "@/app/(dashboard)/dashboard/actions";
import { toast } from "sonner";
import type { SyncResult, SyncEventDetail } from "@/lib/calendar-sync";

interface SyncResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: SyncResult;
  allClients: Array<{ id: number; name: string }>;
  onTagged: () => void;
}

function formatTime(time: string | null): string {
  if (!time) return "--:--";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${minutes} ${ampm}`;
}

function formatTimeRange(
  startTime: string | null,
  endTime: string | null
): string {
  return `${formatTime(startTime)} \u2013 ${formatTime(endTime)}`;
}

function UnmatchedRow({
  event,
  allClients,
  onTagged,
  onRemove,
}: {
  event: SyncEventDetail;
  allClients: Array<{ id: number; name: string }>;
  onTagged: () => void;
  onRemove: (eventId: string) => void;
}) {
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null);
  const [saveEmail, setSaveEmail] = useState(!!event.attendeeEmail);
  const [tagging, setTagging] = useState(false);

  async function handleTag() {
    if (!selected) return;
    setTagging(true);
    const res = await tagUnmatchedEvent({
      eventId: event.eventId,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      clientId: selected.id,
      attendeeEmail: event.attendeeEmail,
      updateClientEmail: saveEmail,
    });
    setTagging(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Tagged "${event.title}" to ${selected.name}`);
      onRemove(event.eventId);
      onTagged();
    }
  }

  return (
    <tr className="border-b last:border-b-0">
      <td className="py-2 pr-3 text-sm">{event.title}</td>
      <td className="py-2 pr-3 text-sm whitespace-nowrap">{event.date}</td>
      <td className="py-2 pr-3 text-sm whitespace-nowrap">
        {formatTimeRange(event.startTime, event.endTime)}
      </td>
      <td className="py-2 pr-3 text-sm text-muted-foreground">
        {event.attendeeEmail ?? "\u2014"}
      </td>
      <td className="py-2 text-sm">
        <div className="flex items-center gap-2">
          <ClientPicker
            suggestions={[]}
            allClients={allClients}
            selected={selected}
            onSelect={setSelected}
          />
          {selected && (
            <div className="flex items-center gap-2">
              {event.attendeeEmail && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                  <Checkbox
                    checked={saveEmail}
                    onCheckedChange={(v) => setSaveEmail(!!v)}
                  />
                  Save email
                </label>
              )}
              <Button
                size="sm"
                className="h-6 text-xs px-2"
                onClick={handleTag}
                disabled={tagging}
              >
                {tagging ? "..." : "Tag"}
              </Button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export function SyncResultsDialog({
  open,
  onOpenChange,
  result,
  allClients,
  onTagged,
}: SyncResultsDialogProps) {
  const [unmatchedEvents, setUnmatchedEvents] = useState<SyncEventDetail[]>(
    result.unmatched
  );

  // Keep local unmatched list in sync when result changes
  // (dialog re-opens with fresh data)
  const [prevResult, setPrevResult] = useState(result);
  if (result !== prevResult) {
    setPrevResult(result);
    setUnmatchedEvents(result.unmatched);
  }

  function handleRemove(eventId: string) {
    setUnmatchedEvents((prev) => prev.filter((e) => e.eventId !== eventId));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Sync Results</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="unmatched" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="unmatched">
              Unmatched ({unmatchedEvents.length})
            </TabsTrigger>
            <TabsTrigger value="new">
              New ({result.created.length})
            </TabsTrigger>
            <TabsTrigger value="skipped">
              Already Imported ({result.skipped.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unmatched" className="overflow-auto flex-1">
            {unmatchedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No unmatched events.
              </p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Title</th>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Time</th>
                    <th className="py-2 pr-3 font-medium">Email</th>
                    <th className="py-2 font-medium">Client</th>
                  </tr>
                </thead>
                <tbody>
                  {unmatchedEvents.map((event) => (
                    <UnmatchedRow
                      key={event.eventId}
                      event={event}
                      allClients={allClients}
                      onTagged={onTagged}
                      onRemove={handleRemove}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </TabsContent>

          <TabsContent value="new" className="overflow-auto flex-1">
            {result.created.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No new appointments imported.
              </p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Title</th>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Time</th>
                    <th className="py-2 font-medium">Client</th>
                  </tr>
                </thead>
                <tbody>
                  {result.created.map((event) => (
                    <tr key={event.eventId} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 text-sm">{event.title}</td>
                      <td className="py-2 pr-3 text-sm whitespace-nowrap">
                        {event.date}
                      </td>
                      <td className="py-2 pr-3 text-sm whitespace-nowrap">
                        {formatTimeRange(event.startTime, event.endTime)}
                      </td>
                      <td className="py-2 text-sm">
                        {event.clientName ?? "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabsContent>

          <TabsContent value="skipped" className="overflow-auto flex-1">
            {result.skipped.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No previously imported events.
              </p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Title</th>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {result.skipped.map((event) => (
                    <tr key={event.eventId} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 text-sm">{event.title}</td>
                      <td className="py-2 pr-3 text-sm whitespace-nowrap">
                        {event.date}
                      </td>
                      <td className="py-2 text-sm whitespace-nowrap">
                        {formatTimeRange(event.startTime, event.endTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
