"use client";

import { useTransition } from "react";
import { usePrivacy } from "@/lib/privacy";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function stripPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function SessionList({ sessions }: { sessions: SessionRow[] }) {
  const { mask, isPrivate } = usePrivacy();
  const [isPending, startTransition] = useTransition();

  function handleCancel(session: SessionRow) {
    startTransition(async () => {
      const result = await cancelSessionAction(session.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Session cancelled");
      }
    });
  }

  function handleSendReminder(session: SessionRow) {
    if (!session.clientPhone || isPrivate) return;
    const phone = stripPhone(session.clientPhone);
    const time = formatTime12h(session.startTime);
    const date = formatDate(session.date);
    const message = `Hi ${session.clientName}, this is a reminder about your appointment on ${date} at ${time}. Looking forward to seeing you!`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
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
                      onClick={() => handleCancel(session)}
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
    </div>
  );
}
