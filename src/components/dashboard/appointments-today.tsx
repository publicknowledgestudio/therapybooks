"use client";

import { CalendarBlank, WhatsappLogo } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { usePrivacy } from "@/lib/privacy";

export interface SessionItem {
  id: number;
  clientName: string;
  clientPhone: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
}

interface AppointmentsTodayProps {
  sessions: SessionItem[];
}

function formatTime(time: string | null): string {
  if (!time) return "--:--";
  // time is in HH:MM:SS or HH:MM format
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${minutes} ${ampm}`;
}

function formatTimeRange(startTime: string | null, endTime: string | null): string {
  return `${formatTime(startTime)} \u2013 ${formatTime(endTime)}`;
}

function firstName(name: string): string {
  return name.split(" ")[0];
}

function stripPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

const statusStyles: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  confirmed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
  no_show: "bg-amber-50 text-amber-700",
};

function StatusBadge({ status }: { status: string }) {
  const label = status === "no_show" ? "No Show" : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        statusStyles[status] ?? "bg-gray-50 text-gray-700"
      }`}
    >
      {label}
    </span>
  );
}

export function AppointmentsToday({ sessions }: AppointmentsTodayProps) {
  const { isPrivate, mask } = usePrivacy();

  if (sessions.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Today&apos;s Appointments</h2>
        <div className="mt-4 rounded-lg border border-border p-8 text-center">
          <CalendarBlank className="mx-auto size-8 text-muted-foreground" weight="regular" />
          <p className="mt-2 text-sm text-muted-foreground">
            No appointments scheduled for today
          </p>
        </div>
      </div>
    );
  }

  function handleSendReminder(session: SessionItem) {
    if (!session.clientPhone || isPrivate) return;
    const phone = stripPhone(session.clientPhone);
    const time = formatTime(session.startTime);
    const message = `Hi ${firstName(session.clientName)}, this is a reminder about your appointment today at ${time}. Looking forward to seeing you!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-foreground">Today&apos;s Appointments</h2>
      <div className="mt-4 overflow-hidden rounded-lg bg-[#f0eae4]">
        <table className="w-full text-sm">
          <thead className="bg-white/50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Time
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Client
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                Reminder
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="transition-colors hover:bg-white even:bg-white/20">
                <td className="px-4 py-3 tabular-nums">
                  {formatTimeRange(session.startTime, session.endTime)}
                </td>
                <td className="px-4 py-3 font-medium">
                  {mask(session.clientName)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={session.status} />
                </td>
                <td className="px-4 py-3 text-right">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
