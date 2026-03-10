"use client";

import { useState, useTransition } from "react";
import { usePrivacy } from "@/lib/privacy";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, VideoCamera, WhatsappLogo, X } from "@/components/ui/icons";
import { cancelSessionAction } from "@/app/(dashboard)/sessions/actions";
import { toast } from "sonner";

export interface SessionRow {
  id: number;
  date: string;
  startTime: string | null;
  clientName: string;
  clientPhone: string | null;
  sessionType: string;
  status: string;
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  scheduled: "outline",
  confirmed: "default",
  cancelled: "destructive",
  no_show: "secondary",
};

function formatTime12h(time: string | null): string {
  if (!time) return "—";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${minutes} ${ampm}`;
}

function formatStatusLabel(status: string): string {
  return status
    .replace("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstName(name: string): string {
  return name.split(" ")[0];
}

function stripPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function SessionList({
  sessions,
  bookingSlug,
}: {
  sessions: SessionRow[];
  bookingSlug: string | null;
}) {
  const { mask, isPrivate } = usePrivacy();
  const [isPending, startTransition] = useTransition();
  const [cancelTarget, setCancelTarget] = useState<SessionRow | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<SessionRow | null>(null);
  const [notifyMessage, setNotifyMessage] = useState("");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const rebookUrl = bookingSlug ? `${origin}/book/${bookingSlug}` : "";

  function buildCancelMessage(session: SessionRow): string {
    const date = formatDate(session.date);
    const time = formatTime12h(session.startTime);
    let msg = `Hi ${firstName(session.clientName)}, I'm sorry but I need to cancel our session on ${date} at ${time}. I apologize for the inconvenience.`;
    if (rebookUrl) {
      msg += `\n\nYou can rebook at your convenience here: ${rebookUrl}`;
    }
    return msg;
  }

  function handleConfirmCancel() {
    if (!cancelTarget) return;
    const session = cancelTarget;
    startTransition(async () => {
      const result = await cancelSessionAction(session.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Session cancelled");
        // Show notify dialog if client has a phone number
        if (session.clientPhone && !isPrivate) {
          setNotifyMessage(buildCancelMessage(session));
          setNotifyTarget(session);
        }
      }
      setCancelTarget(null);
    });
  }

  function handleSendCancelNotification() {
    if (!notifyTarget?.clientPhone) return;
    const phone = stripPhone(notifyTarget.clientPhone);
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(notifyMessage)}`,
      "_blank",
    );
    setNotifyTarget(null);
  }

  function handleSendReminder(session: SessionRow) {
    if (!session.clientPhone || isPrivate) return;
    const phone = stripPhone(session.clientPhone);
    const time = formatTime12h(session.startTime);
    const date = formatDate(session.date);
    const message = `Hi ${firstName(session.clientName)}, this is a reminder about your appointment on ${date} at ${time}. Looking forward to seeing you!`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell>{formatDate(session.date)}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {formatTime12h(session.startTime)}
              </TableCell>
              <TableCell className="font-medium">
                {mask(session.clientName)}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  {session.sessionType === "video" ? (
                    <>
                      <VideoCamera className="size-4" weight="regular" />
                      Google Meet
                    </>
                  ) : (
                    <>
                      <MapPin className="size-4" weight="regular" />
                      In person
                    </>
                  )}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={STATUS_VARIANT[session.status] ?? "outline"}
                  className="capitalize"
                >
                  {formatStatusLabel(session.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {session.status !== "cancelled" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setCancelTarget(session)}
                      disabled={isPending}
                      title="Cancel session"
                    >
                      <X className="size-4" weight="bold" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleSendReminder(session)}
                    disabled={!session.clientPhone || isPrivate}
                    title={
                      isPrivate
                        ? "Disabled in private mode"
                        : session.clientPhone
                          ? "Send WhatsApp reminder"
                          : "No phone number on file"
                    }
                  >
                    <WhatsappLogo className="size-4" weight="regular" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel{" "}
              {cancelTarget
                ? `${mask(cancelTarget.clientName)}'s session on ${formatDate(cancelTarget.date)} at ${formatTime12h(cancelTarget.startTime)}`
                : "this session"}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Keep session
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Cancelling…" : "Cancel session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!notifyTarget}
        onOpenChange={(open) => {
          if (!open) setNotifyTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notify client</DialogTitle>
            <DialogDescription>
              Let {notifyTarget ? mask(notifyTarget.clientName) : "the client"}{" "}
              know about the cancellation via WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={notifyMessage}
            onChange={(e) => setNotifyMessage(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotifyTarget(null)}
            >
              Skip
            </Button>
            <Button onClick={handleSendCancelNotification}>
              <WhatsappLogo className="mr-1.5 size-4" weight="fill" />
              Send on WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
