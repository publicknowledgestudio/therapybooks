"use client";

import { useState } from "react";
import { Spinner, CheckCircle, Clock, CalendarBlank } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface BookingFormProps {
  slug: string;
  selectedDate: string | null;
  selectedSlot: { start: string; end: string } | null;
  duration: number;
  therapistName: string;
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface BookingResult {
  date: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  therapistName: string;
  practiceName: string;
}

export function BookingForm({
  slug,
  selectedDate,
  selectedSlot,
  duration,
  therapistName,
}: BookingFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingResult | null>(null);

  const canSubmit =
    selectedDate && selectedSlot && name.trim() && email.trim() && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          date: selectedDate,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          clientName: name.trim(),
          clientEmail: email.trim(),
          clientPhone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to book appointment");
        return;
      }

      setBooking(data.booking);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Confirmation screen
  if (booking) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle
            size={48}
            weight="fill"
            className="text-foreground"
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Appointment Confirmed
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your appointment has been booked successfully.
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-4 text-left">
          <div className="flex items-center gap-2 text-sm">
            <CalendarBlank size={16} className="text-muted-foreground" />
            <span className="text-foreground">
              {formatDateDisplay(booking.date)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock size={16} className="text-muted-foreground" />
            <span className="text-foreground">
              {formatTime12h(booking.startTime)}
              {booking.endTime && ` - ${formatTime12h(booking.endTime)}`}
              {" "}({booking.duration} min)
            </span>
          </div>
          {(booking.therapistName || booking.practiceName) && (
            <p className="text-sm text-muted-foreground">
              with {booking.therapistName || booking.practiceName}
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          A confirmation has been noted. You may close this page.
        </p>
      </div>
    );
  }

  // Form
  return (
    <div className="space-y-5">
      {/* Summary of selected slot */}
      {selectedDate && selectedSlot && (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-sm">
            <CalendarBlank size={16} className="text-muted-foreground" />
            <span className="text-foreground">
              {formatDateDisplay(selectedDate)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Clock size={16} className="text-muted-foreground" />
            <span className="text-foreground">
              {formatTime12h(selectedSlot.start)} -{" "}
              {formatTime12h(selectedSlot.end)} ({duration} min)
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="booking-name"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Name
          </label>
          <input
            id="booking-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className={cn(
              "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-1 focus:ring-ring",
            )}
          />
        </div>

        <div>
          <label
            htmlFor="booking-email"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Email
          </label>
          <input
            id="booking-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className={cn(
              "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-1 focus:ring-ring",
            )}
          />
        </div>

        <div>
          <label
            htmlFor="booking-phone"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Phone{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="booking-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Your phone number"
            className={cn(
              "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-1 focus:ring-ring",
            )}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            "w-full rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            "bg-foreground text-background",
            "hover:bg-foreground/90",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size={16} className="animate-spin" />
              Booking...
            </span>
          ) : (
            "Book Appointment"
          )}
        </button>

        {!selectedDate && (
          <p className="text-center text-xs text-muted-foreground">
            Select a date and time above to book
          </p>
        )}
        {selectedDate && !selectedSlot && (
          <p className="text-center text-xs text-muted-foreground">
            Select a time slot above to continue
          </p>
        )}
      </form>
    </div>
  );
}
