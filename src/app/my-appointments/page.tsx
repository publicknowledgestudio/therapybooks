"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarBlank, SignOut, X } from "@/components/ui/icons";
import { formatDate } from "@/lib/format";
import type { User } from "@supabase/supabase-js";

type Appointment = {
  id: number;
  clientName: string;
  bookedAt: string;
  cancelledAt: string | null;
  therapistName: string;
  practiceName: string | null;
  sessionDate: string | null;
  startTime: string | null;
  endTime: string | null;
  sessionStatus: string | null;
  durationMinutes: number | null;
  canCancel: boolean;
};

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;

  const styles: Record<string, string> = {
    scheduled: "text-blue-600 bg-blue-50",
    confirmed: "text-green-600 bg-green-50",
    cancelled: "text-red-600 bg-red-50",
    no_show: "text-amber-600 bg-amber-50",
  };

  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    no_show: "No Show",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "text-muted-foreground bg-muted"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function AppointmentRow({
  appointment,
  showCancel,
  onCancel,
  cancelling,
}: {
  appointment: Appointment;
  showCancel: boolean;
  onCancel: (id: number) => void;
  cancelling: number | null;
}) {
  const displayName =
    appointment.practiceName ?? appointment.therapistName;

  return (
    <div className="flex items-center justify-between border-b border-border py-4 last:border-b-0">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {appointment.sessionDate
              ? formatDate(appointment.sessionDate)
              : "No date"}
          </span>
          <StatusBadge
            status={
              appointment.cancelledAt
                ? "cancelled"
                : appointment.sessionStatus
            }
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {appointment.startTime && appointment.endTime
            ? `${formatTime(appointment.startTime)} \u2013 ${formatTime(appointment.endTime)}`
            : "Time not set"}
        </span>
        <span className="text-sm text-muted-foreground">{displayName}</span>
      </div>

      {showCancel && !appointment.cancelledAt && (
        <div>
          {appointment.canCancel ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={cancelling === appointment.id}
              onClick={() => onCancel(appointment.id)}
            >
              <X className="size-3.5" />
              {cancelling === appointment.id ? "Cancelling..." : "Cancel"}
            </Button>
          ) : (
            <span
              className="text-xs text-muted-foreground"
              title="Cancellation deadline has passed"
            >
              Cannot cancel
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AppointmentsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between py-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <CalendarBlank className="size-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function MyAppointmentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [past, setPast] = useState<Appointment[]>([]);
  const [fetchingAppointments, setFetchingAppointments] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    getUser();
  }, [supabase.auth]);

  const fetchAppointments = useCallback(async () => {
    setFetchingAppointments(true);
    try {
      const res = await fetch("/api/client-portal/appointments");
      if (res.ok) {
        const data = await res.json();
        setUpcoming(data.upcoming ?? []);
        setPast(data.past ?? []);
      }
    } finally {
      setFetchingAppointments(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user, fetchAppointments]);

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/my-appointments`,
        queryParams: {
          access_type: "online",
          prompt: "select_account",
        },
      },
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setUpcoming([]);
    setPast([]);
  }

  async function handleCancel(bookingId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );
    if (!confirmed) return;

    setCancelling(bookingId);
    try {
      const res = await fetch("/api/client-portal/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (res.ok) {
        await fetchAppointments();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to cancel appointment");
      }
    } finally {
      setCancelling(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <AppointmentsSkeleton />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <CalendarBlank className="size-12 text-muted-foreground/40 mb-4" />
        <h1 className="text-lg font-semibold text-foreground mb-2">
          My Appointments
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sign in with Google to view your appointments
        </p>
        <Button onClick={handleSignIn}>Sign in with Google</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            My Appointments
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <SignOut className="size-4" />
          Sign Out
        </Button>
      </div>

      {fetchingAppointments ? (
        <AppointmentsSkeleton />
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList variant="line">
            <TabsTrigger value="upcoming">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcoming.length === 0 ? (
              <EmptyState message="No upcoming appointments" />
            ) : (
              <div>
                {upcoming.map((a) => (
                  <AppointmentRow
                    key={a.id}
                    appointment={a}
                    showCancel={true}
                    onCancel={handleCancel}
                    cancelling={cancelling}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {past.length === 0 ? (
              <EmptyState message="No past appointments" />
            ) : (
              <div>
                {past.map((a) => (
                  <AppointmentRow
                    key={a.id}
                    appointment={a}
                    showCancel={false}
                    onCancel={handleCancel}
                    cancelling={cancelling}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
